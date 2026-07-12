import { OcrError } from "../types/errors.js";
import { loadSession, releaseSession, loadOrt } from "./modelLoader.js";
import { preprocessImageDetector, preprocessImagePadded, readImageData, cropImageData, rotateImageData90Clockwise, rotateImageData270Clockwise, } from "./preprocess.js";
import { extractBoxesFromProbabilityMap, nms, ctcGreedyDecode, } from "./postprocess.js";
const DEFAULT_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export function createOnnxOcrEngine(config) {
    let detSession = null;
    let recSession = null;
    let loaded = false;
    let charList = [];
    return {
        async load(signal, onProgress) {
            if (loaded)
                return;
            await loadOrt(config.wasmPath);
            onProgress?.({ phase: "ort", loaded: true });
            let det = null;
            let rec = null;
            try {
                det = await loadSession(config.detectorModelUrl, config.wasmPath, signal);
                onProgress?.({ phase: "detector", loaded: true });
                rec = await loadSession(config.recognizerModelUrl, config.wasmPath, signal);
                onProgress?.({ phase: "recognizer", loaded: true });
            }
            catch (err) {
                await releaseSession(det);
                await releaseSession(rec);
                det = null;
                rec = null;
                throw err;
            }
            detSession = det;
            recSession = rec;
            // Build CTC charList from dict.txt
            // PaddleOCR convention: index 0 = blank, indices 1..N = dict chars
            // charList[0] = "" (blank, never emitted), charList[1] = first dict char, etc.
            if (!config.alphabet && config.dictUrl) {
                try {
                    const resp = await fetch(config.dictUrl);
                    if (resp.ok) {
                        const text = await resp.text();
                        const chars = text.split("\n").filter((l) => l.length > 0);
                        // PaddleOCR models: blank(0) + dict(1..N) + space(N+1)
                        // Append space so model output index for space maps correctly
                        charList = ["", ...chars, " "];
                    }
                }
                catch {
                    // fall through
                }
            }
            if (charList.length === 0) {
                const fallback = config.alphabet ?? DEFAULT_ALPHABET;
                charList = ["", ...fallback.split(""), " "];
            }
            loaded = true;
        },
        async recognize(frame, _context, signal) {
            if (!loaded || !detSession || !recSession) {
                throw new OcrError("MODEL_LOAD_FAILED", "Engine not loaded – call load() first");
            }
            if (signal?.aborted) {
                throw new DOMException("Aborted", "AbortError");
            }
            const startTime = performance.now();
            try {
                const ort = await loadOrt(config.wasmPath);
                const maxSide = config.detectorMaxSide ?? 960;
                const recH = config.recognizerInputHeight ?? 48;
                const threshold = config.detectionThreshold ?? 0.3;
                const nmsThresh = config.nmsIouThreshold ?? 0.4;
                const minArea = config.minDetectionBoxArea ?? 100;
                const blankIdx = config.blankTokenIndex ?? 0;
                // ── 1. Read source image ──
                const imageData = readImageData(frame.imageData, frame.width, frame.height);
                // ── 2. Detection ──
                // Resize preserving aspect ratio, symmetric pad to multiple of 32
                const detPreprocessed = preprocessImageDetector(imageData, maxSide, maxSide, 32);
                const detTensor = new ort.Tensor("float32", detPreprocessed.tensorData, [1, 3, detPreprocessed.height, detPreprocessed.width]);
                const detInputName = config.detectorInputName ?? detSession.inputNames[0] ?? "input";
                const detFeeds = {};
                detFeeds[detInputName] = detTensor;
                const detOutput = await detSession.run(detFeeds);
                const detOutputName = config.detectorOutputName ?? detSession.outputNames[0] ?? "output";
                const probTensor = detOutput[detOutputName];
                if (!probTensor) {
                    return { detections: [], inferenceDurationMs: performance.now() - startTime };
                }
                const probData = probTensor.data;
                const probDims = probTensor.dims;
                // Output shape [1,1,H,W] — extract H,W
                const mapH = probDims.length >= 3 ? probDims[probDims.length - 2] : detPreprocessed.height;
                const mapW = probDims.length >= 3 ? probDims[probDims.length - 1] : detPreprocessed.width;
                // PaddleOCR detector export already includes Sigmoid in the ONNX graph,
                // so the output is already a probability map in [0, 1].
                const probMap = probData;
                let boxes = extractBoxesFromProbabilityMap(probMap, mapW, mapH, frame.width, frame.height, threshold, minArea, {
                    padW: detPreprocessed.width,
                    padH: detPreprocessed.height,
                    offsetX: detPreprocessed.offsetX,
                    offsetY: detPreprocessed.offsetY,
                    resizeW: detPreprocessed.resizeW,
                    resizeH: detPreprocessed.resizeH,
                });
                boxes = nms(boxes, nmsThresh);
                // ── 3. Recognition on each detected region ──
                const detections = [];
                const recMinPaddedW = 96;
                // Narrow recSession for the nested async helper.
                const rec = recSession;
                async function recognizeFromCrop(cropped) {
                    const scale = recH / cropped.height;
                    const rawW = Math.max(1, Math.round(cropped.width * scale));
                    let paddedW = Math.ceil(rawW / 32) * 32;
                    paddedW = Math.max(recMinPaddedW, paddedW);
                    paddedW = Math.min(1024, paddedW);
                    const recPreprocessed = preprocessImagePadded(cropped, rawW, recH, paddedW);
                    const recTensor = new ort.Tensor("float32", recPreprocessed.tensorData, [1, 3, recH, paddedW]);
                    const recInputName = config.recognizerInputName ?? rec.inputNames[0] ?? "input";
                    const recFeeds = {};
                    recFeeds[recInputName] = recTensor;
                    const recOutput = await rec.run(recFeeds);
                    const recOutputName = config.recognizerOutputName ?? rec.outputNames[0] ?? "output";
                    const logitsTensor = recOutput[recOutputName];
                    if (!logitsTensor)
                        return { text: "", score: -Infinity };
                    const logits = logitsTensor.data;
                    const logitDims = logitsTensor.dims;
                    // Shape: [1, T, numClasses]
                    const timesteps = logitDims.length >= 3 ? logitDims[1] : logitDims[0];
                    const numClasses = logitDims.length >= 3 ? logitDims[2] : logitDims[1];
                    const text = ctcGreedyDecode(logits, timesteps, numClasses, charList, blankIdx);
                    // Simple confidence proxy for comparing rotated candidates.
                    let sumMax = 0;
                    for (let t = 0; t < timesteps; t++) {
                        let maxVal = -Infinity;
                        const offset = t * numClasses;
                        for (let c = 0; c < numClasses; c++) {
                            const v = logits[offset + c] ?? -Infinity;
                            if (v > maxVal)
                                maxVal = v;
                        }
                        sumMax += maxVal;
                    }
                    const score = sumMax / Math.max(1, timesteps);
                    // Prefer non-empty outputs when comparing rotations.
                    const adjustedScore = text.trim().length > 0 ? score : score - 1e6;
                    return { text, score: adjustedScore };
                }
                for (const box of boxes) {
                    // Expand the detection box slightly so the recognizer sees full glyphs.
                    const padX = Math.max(2, Math.round(box.width * 0.08));
                    const padY = Math.max(2, Math.round(box.height * 0.12));
                    const srcW = imageData.width;
                    const srcH = imageData.height;
                    const x0 = Math.max(0, box.x - padX);
                    const y0 = Math.max(0, box.y - padY);
                    const w0 = Math.min(srcW - x0, box.width + padX * 2);
                    const h0 = Math.min(srcH - y0, box.height + padY * 2);
                    if (w0 <= 1 || h0 <= 1)
                        continue;
                    const cropped0 = cropImageData(imageData, x0, y0, w0, h0);
                    const isTall = box.height > box.width * 1.35;
                    if (isTall) {
                        const c0 = await recognizeFromCrop(cropped0);
                        const c90 = await recognizeFromCrop(rotateImageData90Clockwise(cropped0));
                        const c270 = await recognizeFromCrop(rotateImageData270Clockwise(cropped0));
                        let best = c0;
                        if (c90.score > best.score)
                            best = c90;
                        if (c270.score > best.score)
                            best = c270;
                        detections.push({
                            text: best.text,
                            confidence: box.confidence,
                            box: {
                                x: Math.round(box.x),
                                y: Math.round(box.y),
                                width: Math.round(box.width),
                                height: Math.round(box.height),
                            },
                        });
                    }
                    else {
                        const best = await recognizeFromCrop(cropped0);
                        detections.push({
                            text: best.text,
                            confidence: box.confidence,
                            box: {
                                x: Math.round(box.x),
                                y: Math.round(box.y),
                                width: Math.round(box.width),
                                height: Math.round(box.height),
                            },
                        });
                    }
                }
                const inferenceDurationMs = performance.now() - startTime;
                return { detections, inferenceDurationMs };
            }
            catch (err) {
                if (err instanceof OcrError)
                    throw err;
                if (err instanceof DOMException && err.name === "AbortError")
                    throw err;
                throw new OcrError("INFERENCE_FAILED", err instanceof Error ? err.message : "Unknown inference error", { cause: err });
            }
        },
        async dispose() {
            if (!loaded)
                return;
            loaded = false;
            await Promise.all([releaseSession(detSession), releaseSession(recSession)]);
            detSession = null;
            recSession = null;
        },
    };
}
//# sourceMappingURL=OnnxOcrEngine.js.map