import type { AnnotationStroke } from "../types/public.js";
export interface DrawingLayer {
    enable(): void;
    disable(): void;
    isEnabled(): boolean;
    clear(): void;
    getStrokes(): AnnotationStroke[];
    destroy(): void;
}
export interface DrawingLayerCallbacks {
    onAnnotationChange?: (strokes: AnnotationStroke[]) => void;
}
export declare function createDrawingLayer(canvas: HTMLCanvasElement, callbacks?: DrawingLayerCallbacks): DrawingLayer;
//# sourceMappingURL=DrawingLayer.d.ts.map