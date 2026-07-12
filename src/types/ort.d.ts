export interface OnnxRuntimeWasm {
  env: { wasm: { wasmPaths: string | Record<string, string> } };
  Tensor: typeof Tensor;
  InferenceSession: typeof InferenceSession;
}

export interface Tensor {
  data: Float32Array | Uint8Array | Int32Array;
  dims: number[];
  type: string;
}

export interface InferenceSession {
  inputNames: readonly string[];
  outputNames: readonly string[];
  run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor>>;
  release(): Promise<void>;
}

export declare const InferenceSession: {
  create(path: string, options?: unknown): Promise<InferenceSession>;
};

export declare const Tensor: {
  new (
    type: string,
    data: Float32Array | Uint8Array | Int32Array,
    dims: number[]
  ): Tensor;
};
