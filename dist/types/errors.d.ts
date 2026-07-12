export type OcrErrorCode = "UNSUPPORTED_BROWSER" | "INSECURE_CONTEXT" | "CAMERA_PERMISSION_DENIED" | "CAMERA_NOT_FOUND" | "CAMERA_START_FAILED" | "MODEL_LOAD_FAILED" | "WASM_LOAD_FAILED" | "INFERENCE_FAILED" | "INVALID_CROP" | "INVALID_STATE" | "DESTROYED";
export declare class OcrError extends Error {
    readonly code: OcrErrorCode;
    constructor(code: OcrErrorCode, message: string, options?: ErrorOptions);
}
export declare function createOcrError(code: OcrErrorCode, message: string, cause?: unknown): OcrError;
//# sourceMappingURL=errors.d.ts.map