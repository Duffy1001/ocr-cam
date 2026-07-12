import type { OcrConfig, OcrEventMap, CameraStartOptions, CameraSessionInfo, CropConfiguration, ResolvedCropRegion, ViewOptions, OcrViewHandle } from "../types/public.js";
import type { OcrEngine } from "../engine/OcrEngine.js";
import { OcrState } from "../types/state.js";
export interface OcrController {
    load(): Promise<void> | undefined;
    startCamera(options?: CameraStartOptions): Promise<CameraSessionInfo>;
    stopCamera(): Promise<void>;
    attachView(container: HTMLElement, options?: ViewOptions): OcrViewHandle;
    detachView(): void;
    setCrop(crop: CropConfiguration | null): void;
    getCrop(): ResolvedCropRegion | null;
    setDrawingEnabled(enabled: boolean): void;
    clearDrawing(): void;
    getState(): OcrState;
    on<K extends keyof OcrEventMap>(event: K, listener: OcrEventMap[K]): () => void;
    destroy(): Promise<void>;
}
export declare function createOcrController(config: OcrConfig, engine?: OcrEngine): OcrController;
//# sourceMappingURL=OcrController.d.ts.map