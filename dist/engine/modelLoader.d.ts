import type { OnnxRuntimeWasm, InferenceSession } from "../types/ort.js";
/**
 * Load or return the cached ONNX Runtime WASM module.
 * The wasmPath is applied on the first load; subsequent calls ignore different wasmPath values.
 */
export declare function loadOrt(wasmPath?: string): Promise<OnnxRuntimeWasm>;
/**
 * Load a single ONNX InferenceSession from a URL.
 */
export declare function loadSession(url: string, wasmPath?: string, signal?: AbortSignal): Promise<InferenceSession>;
/**
 * Release an ONNX InferenceSession, ignoring errors.
 */
export declare function releaseSession(session: InferenceSession | null): Promise<void>;
//# sourceMappingURL=modelLoader.d.ts.map