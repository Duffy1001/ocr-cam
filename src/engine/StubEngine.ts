import type { OcrEngine } from "./OcrEngine.js";
import type { OcrInputFrame } from "../types/internal.js";
import type { OcrEngineResult, OcrFrameContext, LoadProgress } from "../types/public.js";
import { OcrError } from "../types/errors.js";

/**
 * A deterministic stub OCR engine for testing.
 * Returns pre-configured results in round-robin order.
 * Do NOT use in production – this performs no real inference.
 */
export interface StubEngineOptions {
  /** Simulated inference delay in ms (default: 0) */
  delay?: number;
  /** Results to cycle through for each recognize() call */
  results?: OcrEngineResult[];
}

export function createStubEngine(options?: StubEngineOptions): OcrEngine {
  let loaded = false;
  let callCount = 0;
  const results = options?.results ?? [];
  const delay = options?.delay ?? 0;

  return {
    async load(_signal?: AbortSignal, onProgress?: (progress: LoadProgress) => void): Promise<void> {
      loaded = true;
      onProgress?.({ phase: "ort", loaded: true });
      onProgress?.({ phase: "detector", loaded: true });
      onProgress?.({ phase: "recognizer", loaded: true });
    },

    async recognize(
      _frame: OcrInputFrame,
      _context: OcrFrameContext,
      _signal?: AbortSignal
    ): Promise<OcrEngineResult> {
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

    async dispose(): Promise<void> {
      loaded = false;
      callCount = 0;
    },
  };
}
