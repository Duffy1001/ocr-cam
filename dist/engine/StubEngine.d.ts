import type { OcrEngine } from "./OcrEngine.js";
import type { OcrEngineResult } from "../types/public.js";
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
export declare function createStubEngine(options?: StubEngineOptions): OcrEngine;
//# sourceMappingURL=StubEngine.d.ts.map