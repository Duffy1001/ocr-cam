import type { OcrEngine } from "./OcrEngine.js";
import type { EngineConfig } from "../types/public.js";
export interface OnnxEngineConfig extends EngineConfig {
    detectorInputName?: string;
    detectorOutputName?: string;
    /** Max long side for detector input (default: 960) */
    detectorMaxSide?: number;
    /** Probability threshold for text detection (default: 0.3) */
    detectionThreshold?: number;
    /** IoU threshold for NMS (default: 0.4) */
    nmsIouThreshold?: number;
    /** Minimum box area in source pixels to keep (default: 100) */
    minDetectionBoxArea?: number;
    /** Recognizer input height (default: 48 for PaddleOCR) */
    recognizerInputHeight?: number;
    recognizerInputName?: string;
    recognizerOutputName?: string;
    dictUrl?: string;
    alphabet?: string;
    blankTokenIndex?: number;
}
export declare function createOnnxOcrEngine(config: OnnxEngineConfig): OcrEngine;
//# sourceMappingURL=OnnxOcrEngine.d.ts.map