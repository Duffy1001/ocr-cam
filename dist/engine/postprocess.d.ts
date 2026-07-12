/**
 * Detection and recognition post-processing.
 *
 * Model assumptions:
 *   - Detector outputs a single probability map of shape [1, 1, H, W]
 *     with values in [0, 1] after sigmoid.
 *   - Connected components above a threshold are extracted as text regions.
 *   - Each region is converted to a bounding box in source coordinates.
 *   - NMS removes overlapping detections.
 *
 *   - Recognizer outputs logits of shape [1, T, numClasses].
 *   - CTC greedy decoding is used (argmax + dedup + remove blank).
 *   - The blank token index is configurable (default: 0 for CTC convention).
 */
import type { OcrDetection } from "../types/public.js";
export interface DetectionBox {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
}
export declare function nms(boxes: DetectionBox[], iouThreshold: number): DetectionBox[];
export declare function extractBoxesFromProbabilityMap(prob: Float32Array, mapW: number, mapH: number, srcW: number, srcH: number, threshold: number, minBoxArea: number, opts?: {
    /** Padded detector input width. */
    padW?: number;
    /** Padded detector input height. */
    padH?: number;
    /** Offset of resized image within the padded detector input (in input/padded pixels). */
    offsetX?: number;
    /** Offset of resized image within the padded detector input (in input/padded pixels). */
    offsetY?: number;
    /** Resized image width inside the padded detector input (in input/padded pixels). */
    resizeW?: number;
    /** Resized image height inside the padded detector input (in input/padded pixels). */
    resizeH?: number;
}): DetectionBox[];
export declare function boxesToDetections(boxes: DetectionBox[]): OcrDetection[];
/**
 * Decode a [T, numClasses] logit array using CTC greedy decoding.
 *
 * - `blankIndex`: CTC blank token (default 0).
 * - `charList`: array indexed by model output class. charList[blankIndex] is ignored.
 *   Example: ["", "a", "b", ..., " "] where index 0 = blank, 1 = first char, etc.
 *
 * Output: collapse consecutive identical non-blank tokens.
 */
export declare function ctcGreedyDecode(logits: Float32Array, timesteps: number, numClasses: number, charList: string[], blankIndex: number): string;
//# sourceMappingURL=postprocess.d.ts.map