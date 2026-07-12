export type OcrState = "idle" | "loading" | "ready" | "starting-camera" | "running" | "stopping-camera" | "error" | "destroyed";
export declare const VALID_TRANSITIONS: Record<OcrState, readonly OcrState[]>;
export declare function isValidTransition(from: OcrState, to: OcrState): boolean;
//# sourceMappingURL=state.d.ts.map