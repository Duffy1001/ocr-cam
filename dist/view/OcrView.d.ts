import type { ResolvedCropRegion, AnnotationStroke } from "../types/public.js";
import type { OcrResult } from "../types/public.js";
export interface OcrView {
    updateResult(result: OcrResult): void;
    updateCrop(crop: ResolvedCropRegion | null): void;
    setDrawingEnabled(enabled: boolean): void;
    clearDrawing(): void;
    getStrokes(): AnnotationStroke[];
    destroy(): void;
}
export interface OcrViewOptions {
    outsideCropOpacity?: number;
    showCropBorder?: boolean;
    showBoundingBoxes?: boolean;
    showRecognizedText?: boolean;
    drawingEnabled?: boolean;
}
export declare function createOcrView(container: HTMLElement, video: HTMLVideoElement, crop: ResolvedCropRegion | null, options?: OcrViewOptions): OcrView;
//# sourceMappingURL=OcrView.d.ts.map