import type {
  OcrEngineResult,
  OcrFrameContext,
  LoadProgress,
} from "../types/public.js";
import type { OcrInputFrame } from "../types/internal.js";

export interface OcrEngine {
  load(signal?: AbortSignal, onProgress?: (progress: LoadProgress) => void): Promise<void>;
  recognize(
    frame: OcrInputFrame,
    context: OcrFrameContext,
    signal?: AbortSignal
  ): Promise<OcrEngineResult>;
  dispose(): Promise<void>;
}
