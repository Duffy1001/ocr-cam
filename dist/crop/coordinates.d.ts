import type { Point, PixelRect, ResolvedCropRegion } from "../types/public.js";
export interface SourceToDisplayTransform {
    scaleX: number;
    scaleY: number;
    offsetX: number;
    offsetY: number;
}
export interface DisplaySize {
    width: number;
    height: number;
}
export declare function computeSourceToDisplayTransform(sourceWidth: number, sourceHeight: number, displayWidth: number, displayHeight: number): SourceToDisplayTransform;
export declare function transformRect(rect: PixelRect, transform: SourceToDisplayTransform): PixelRect;
export declare function transformPoint(point: Point, transform: SourceToDisplayTransform): Point;
export declare function translateDetectionFromCrop(detection: import("../types/public.js").OcrDetection, crop: ResolvedCropRegion): import("../types/public.js").OcrDetection;
//# sourceMappingURL=coordinates.d.ts.map