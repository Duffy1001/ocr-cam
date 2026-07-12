import { OcrError } from "../types/errors.js";
export function createStubEngine(options) {
    let loaded = false;
    let callCount = 0;
    const results = options?.results ?? [];
    const delay = options?.delay ?? 0;
    return {
        async load(_signal, onProgress) {
            loaded = true;
            onProgress?.({ phase: "ort", loaded: true });
            onProgress?.({ phase: "detector", loaded: true });
            onProgress?.({ phase: "recognizer", loaded: true });
        },
        async recognize(_frame, _context, _signal) {
            if (!loaded) {
                throw new OcrError("MODEL_LOAD_FAILED", "StubEngine not loaded");
            }
            if (delay > 0) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
            const result = results[callCount % results.length] ?? { detections: [] };
            callCount++;
            return result;
        },
        async dispose() {
            loaded = false;
            callCount = 0;
        },
    };
}
//# sourceMappingURL=StubEngine.js.map