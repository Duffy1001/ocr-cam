import type { EngineConfig, OcrEngineResult } from "../types/public.js";

export type WorkerRequest =
  | { type: "load"; requestId: string; config: EngineConfig }
  | {
      type: "recognize";
      requestId: string;
      frame: {
        data: ArrayBuffer;
        width: number;
        height: number;
        sessionId: number;
        frameId: number;
        crop: { x: number; y: number; width: number; height: number } | null;
      };
    }
  | { type: "dispose"; requestId: string };

export type WorkerResponse =
  | { type: "loaded"; requestId: string }
  | { type: "result"; requestId: string; result: OcrEngineResult }
  | { type: "error"; requestId: string; error: { code: string; message: string } };

export function serializeError(err: unknown): { code: string; message: string } {
  if (err instanceof Error) {
    return { code: (err as any).code ?? "UNKNOWN", message: err.message };
  }
  return { code: "UNKNOWN", message: String(err) };
}
