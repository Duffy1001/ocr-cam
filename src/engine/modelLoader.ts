import type { OnnxRuntimeWasm, InferenceSession } from "../types/ort.js";
import { OcrError } from "../types/errors.js";

let ortModule: OnnxRuntimeWasm | null = null;
let ortLoadPromise: Promise<OnnxRuntimeWasm> | null = null;

/**
 * Load or return the cached ONNX Runtime WASM module.
 * The wasmPath is applied on the first load; subsequent calls ignore different wasmPath values.
 */
export async function loadOrt(wasmPath?: string): Promise<OnnxRuntimeWasm> {
  if (ortModule) return ortModule;

  if (ortLoadPromise) return ortLoadPromise;

  ortLoadPromise = (async () => {
    try {
      const mod = await import("onnxruntime-web/wasm") as OnnxRuntimeWasm;
      if (wasmPath) {
        mod.env.wasm.wasmPaths = wasmPath;
      }
      ortModule = mod;
      return mod;
    } catch (err) {
      ortLoadPromise = null;
      throw new OcrError("WASM_LOAD_FAILED", "Failed to load onnxruntime-web/wasm", { cause: err });
    }
  })();

  return ortLoadPromise;
}

/**
 * Load a single ONNX InferenceSession from a URL.
 */
export async function loadSession(
  url: string,
  wasmPath?: string,
  signal?: AbortSignal
): Promise<InferenceSession> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const ort = await loadOrt(wasmPath);
  try {
    return await ort.InferenceSession.create(url);
  } catch (err) {
    throw new OcrError("MODEL_LOAD_FAILED", `Failed to load model from ${url}`, { cause: err });
  }
}

/**
 * Release an ONNX InferenceSession, ignoring errors.
 */
export async function releaseSession(session: InferenceSession | null): Promise<void> {
  if (!session) return;
  try {
    await session.release();
  } catch {
    // release() may fail on already-freed sessions; swallow
  }
}
