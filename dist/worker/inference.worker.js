self.onmessage = (event) => {
    const msg = event.data;
    switch (msg.type) {
        case "load":
            handleLoad(msg);
            break;
        case "recognize":
            handleRecognize(msg);
            break;
        case "dispose":
            handleDispose(msg);
            break;
    }
};
async function handleLoad(msg) {
    try {
        const ort = await import("onnxruntime-web/wasm");
        if (msg.config.wasmPath) {
            ort.env.wasm.wasmPaths = msg.config.wasmPath;
        }
        const [detector, recognizer] = await Promise.all([
            ort.InferenceSession.create(msg.config.detectorModelUrl),
            ort.InferenceSession.create(msg.config.recognizerModelUrl),
        ]);
        self.__detectorSession = detector;
        self.__recognizerSession = recognizer;
        respond({ type: "loaded", requestId: msg.requestId });
    }
    catch (err) {
        respond({
            type: "error",
            requestId: msg.requestId,
            error: {
                code: "MODEL_LOAD_FAILED",
                message: err instanceof Error ? err.message : String(err),
            },
        });
    }
}
async function handleRecognize(msg) {
    try {
        const detector = self.__detectorSession;
        const recognizer = self.__recognizerSession;
        if (!detector || !recognizer) {
            throw new Error("Models not loaded");
        }
        // Placeholder inference - real implementation would run
        // detection + recognition pipeline
        const result = {
            detections: [],
            inferenceDurationMs: 0,
        };
        respond({
            type: "result",
            requestId: msg.requestId,
            result,
        });
    }
    catch (err) {
        respond({
            type: "error",
            requestId: msg.requestId,
            error: {
                code: "INFERENCE_FAILED",
                message: err instanceof Error ? err.message : String(err),
            },
        });
    }
}
async function handleDispose(msg) {
    try {
        const detector = self.__detectorSession;
        const recognizer = self.__recognizerSession;
        if (detector?.release)
            await detector.release();
        if (recognizer?.release)
            await recognizer.release();
        self.__detectorSession = null;
        self.__recognizerSession = null;
        respond({ type: "loaded", requestId: msg.requestId });
    }
    catch (err) {
        respond({
            type: "error",
            requestId: msg.requestId,
            error: {
                code: "UNKNOWN",
                message: err instanceof Error ? err.message : String(err),
            },
        });
    }
}
function respond(response) {
    self.postMessage(response);
}
export {};
//# sourceMappingURL=inference.worker.js.map