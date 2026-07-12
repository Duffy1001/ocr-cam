import { OcrError } from "../types/errors.js";
let ortModule = null;
let ortLoadPromise = null;
/**
 * Load or return the cached ONNX Runtime WASM module.
 * The wasmPath is applied on the first load; subsequent calls ignore different wasmPath values.
 */
export async function loadOrt(wasmPath) {
    if (ortModule)
        return ortModule;
    if (ortLoadPromise)
        return ortLoadPromise;
    ortLoadPromise = (async () => {
        try {
            const mod = await import("onnxruntime-web/wasm");
            if (wasmPath) {
                mod.env.wasm.wasmPaths = wasmPath;
            }
            ortModule = mod;
            return mod;
        }
        catch (err) {
            ortLoadPromise = null;
            throw new OcrError("WASM_LOAD_FAILED", "Failed to load onnxruntime-web/wasm", { cause: err });
        }
    })();
    return ortLoadPromise;
}
/**
 * Load a single ONNX InferenceSession from a URL.
 */
export async function loadSession(url, wasmPath, signal) {
    if (signal?.aborted)
        throw new DOMException("Aborted", "AbortError");
    const ort = await loadOrt(wasmPath);
    try {
        return await ort.InferenceSession.create(url);
    }
    catch (err) {
        throw new OcrError("MODEL_LOAD_FAILED", `Failed to load model from ${url}`, { cause: err });
    }
}
/**
 * Release an ONNX InferenceSession, ignoring errors.
 */
export async function releaseSession(session) {
    if (!session)
        return;
    try {
        await session.release();
    }
    catch {
        // release() may fail on already-freed sessions; swallow
    }
}
//# sourceMappingURL=modelLoader.js.map