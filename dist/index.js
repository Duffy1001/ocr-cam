import { createOcrController } from "./controller/OcrController.js";
export { OcrError } from "./types/errors.js";
export { createOnnxOcrEngine } from "./engine/OnnxOcrEngine.js";
export { createStubEngine } from "./engine/StubEngine.js";
/**
 * Create a headless browser OCR instance.
 *
 * This call has NO side effects:
 * - No camera permission is requested
 * - No DOM elements are created
 * - No workers are started
 * - No models are downloaded
 * - No animation loops begin
 * - No visible UI is rendered
 *
 * All expensive behavior requires explicit method calls.
 */
export function createBrowserOcr(config, engine) {
    return createOcrController(config, engine);
}
//# sourceMappingURL=index.js.map