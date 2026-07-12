import type { OcrState } from "./state.js";
export interface Point {
    x: number;
    y: number;
}
export interface PixelRect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface OcrDetection {
    id?: string;
    text: string;
    confidence: number;
    box: PixelRect;
    polygon?: [Point, Point, Point, Point];
}
export interface OcrResult {
    sessionId: number;
    frameId: number;
    timestamp: number;
    sourceSize: {
        width: number;
        height: number;
    };
    crop: PixelRect | null;
    detections: OcrDetection[];
    text: string;
    inferenceDurationMs?: number;
}
export type CropConfiguration = {
    unit: "normalized";
    x: number;
    y: number;
    width: number;
    height: number;
} | {
    unit: "source-px";
    x?: number;
    y?: number;
    width: number;
    height: number;
    anchor?: "center" | "top" | "bottom";
};
export interface ResolvedCropRegion {
    x: number;
    y: number;
    width: number;
    height: number;
    sourceWidth: number;
    sourceHeight: number;
}
export interface CameraStartOptions {
    constraints?: MediaStreamConstraints;
    facingMode?: "environment" | "user";
}
export interface CameraSessionInfo {
    sessionId: number;
    width: number;
    height: number;
    facingMode: string | undefined;
}
export interface ViewOptions {
    outsideCropOpacity?: number;
    showCropBorder?: boolean;
    showBoundingBoxes?: boolean;
    showRecognizedText?: boolean;
    drawingEnabled?: boolean;
}
export interface OcrViewHandle {
    detach(): void;
}
export interface OcrActionState {
    /** Whether calling `load()` is currently allowed/useful. */
    canLoad: boolean;
    /** Whether calling `startCamera()` is currently allowed. */
    canStartCamera: boolean;
    /** Whether calling `stopCamera()` is currently allowed. */
    canStopCamera: boolean;
    /** Whether toggling drawing is currently allowed (view must be attached). */
    canToggleDrawing: boolean;
    /** Whether clearing drawing is currently allowed (view must be attached). */
    canClearDrawing: boolean;
}
export interface EngineConfig {
    detectorModelUrl: string;
    recognizerModelUrl: string;
    wasmPath?: string;
    dictUrl?: string;
}
export interface OcrConfig {
    engine: EngineConfig;
    camera?: {
        facingMode?: "environment" | "user";
        constraints?: MediaStreamConstraints;
    };
    inference?: {
        maxFps?: number;
        /**
         * Temporal ensembling/smoothing across recent OCR results.
         * When enabled, the controller will cluster detections across the last `windowSize`
         * processed frames and output a smoothed set of boxes + text.
         */
        temporal?: TemporalEnsembleConfig;
    };
    crop?: CropConfiguration;
    view?: ViewOptions;
    onResult?: (result: OcrResult) => void;
    onError?: (error: Error) => void;
    onLoadProgress?: (progress: LoadProgress) => void;
}
export interface TemporalEnsembleConfig {
    /** Number of processed frames to ensemble (default: 3). */
    windowSize?: number;
    /** Run inference on every Nth processed frame tick (default: 1). */
    stride?: number;
    /** IoU threshold used to cluster detections across frames (default: 0.5). */
    boxIouThreshold?: number;
    /**
     * Optional pixel-level temporal smoothing to reduce lighting flicker.
     * If set, controller applies: smoothed = alpha*current + (1-alpha)*previous.
     * Range: (0, 1). Higher = follow current frame more.
     */
    inputSmoothingAlpha?: number;
    /** If true, applies a lightweight per-frame luma contrast stretch before inference. */
    contrastStretch?: boolean;
}
export interface AnnotationStroke {
    points: Array<{
        x: number;
        y: number;
        pressure?: number;
        timestamp: number;
    }>;
    sourceCoordinatePoints?: Point[];
}
export interface OcrFrameContext {
    sessionId: number;
    frameId: number;
    timestamp: number;
    crop: ResolvedCropRegion | null;
    sourceSize: {
        width: number;
        height: number;
    };
}
export interface OcrEngineResult {
    detections: OcrDetection[];
    inferenceDurationMs?: number;
}
export type LoadProgressPhase = "ort" | "detector" | "recognizer";
export interface LoadProgress {
    phase: LoadProgressPhase;
    loaded: boolean;
}
export interface OcrEventMap {
    statechange: (state: OcrState) => void;
    result: (result: OcrResult) => void;
    error: (error: Error) => void;
    loadprogress: (progress: LoadProgress) => void;
    actionschange: (actions: OcrActionState) => void;
    camerastart: (info: CameraSessionInfo) => void;
    camerastop: () => void;
    cropchange: (crop: ResolvedCropRegion | null) => void;
    annotationchange: (strokes: AnnotationStroke[]) => void;
}
//# sourceMappingURL=public.d.ts.map