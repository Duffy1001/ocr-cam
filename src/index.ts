import type { OcrConfig } from "./types/public.js";
import type { OcrController } from "./controller/OcrController.js";
import { createOcrController } from "./controller/OcrController.js";

export type {
  OcrConfig,
  OcrResult,
  OcrDetection,
  Point,
  PixelRect,
  CropConfiguration,
  ResolvedCropRegion,
  CameraStartOptions,
  CameraSessionInfo,
  ViewOptions,
  OcrViewHandle,
  OcrEventMap,
  OcrActionState,
  AnnotationStroke,
  EngineConfig,
  OcrFrameContext,
  OcrEngineResult,
} from "./types/public.js";

export type { OcrState } from "./types/state.js";
export { OcrError } from "./types/errors.js";
export type { OcrErrorCode } from "./types/errors.js";
export type { OcrEngine } from "./engine/OcrEngine.js";
export type { OcrController } from "./controller/OcrController.js";
export type { OnnxEngineConfig } from "./engine/OnnxOcrEngine.js";
export { createOnnxOcrEngine } from "./engine/OnnxOcrEngine.js";
export type { StubEngineOptions } from "./engine/StubEngine.js";
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
export function createBrowserOcr(
  config: OcrConfig,
  engine?: import("./engine/OcrEngine.js").OcrEngine
): OcrController {
  return createOcrController(config, engine);
}
