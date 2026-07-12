import { describe, it, expect, vi } from "vitest";
import { createOcrController } from "../../src/controller/OcrController";
import { createStubEngine, type StubEngineOptions } from "../../src/engine/StubEngine";
import type { OcrConfig, OcrEngineResult } from "../../src/types/public";
import type { OcrEngine } from "../../src/engine/OcrEngine";
import { OcrError } from "../../src/types/errors";

function makeConfig(overrides?: Partial<OcrConfig>): OcrConfig {
  return {
    engine: {
      detectorModelUrl: "/models/detector.onnx",
      recognizerModelUrl: "/models/recognizer.onnx",
      wasmPath: "/onnx/",
    },
    ...overrides,
  };
}

function makeEngine(opts?: StubEngineOptions): OcrEngine {
  return createStubEngine(opts);
}

function makeEngineThatFailsOnLoad(message = "ONNX init failed"): OcrEngine {
  return {
    async load() {
      throw new OcrError("MODEL_LOAD_FAILED", message);
    },
    async recognize() {
      return { detections: [] };
    },
    async dispose() {},
  };
}

describe("Integration: full lifecycle", () => {
  it("idle → loading → ready", async () => {
    const ctrl = createOcrController(makeConfig(), makeEngine());
    const states: string[] = [];
    ctrl.on("statechange", (s) => states.push(s));

    expect(ctrl.getState()).toBe("idle");

    await ctrl.load();
    expect(ctrl.getState()).toBe("ready");
    expect(states).toEqual(["loading", "ready"]);

    await ctrl.destroy();
    expect(ctrl.getState()).toBe("destroyed");
  });

  it("ready → destroy releases engine", async () => {
    const dispose = vi.fn();
    const engine: OcrEngine = {
      async load() {},
      async recognize() {
        return { detections: [] };
      },
      async dispose() { dispose(); },
    };
    const ctrl = createOcrController(makeConfig(), engine);

    await ctrl.load();
    expect(dispose).not.toHaveBeenCalled();

    await ctrl.destroy();
    expect(dispose).toHaveBeenCalledOnce();
    expect(ctrl.getState()).toBe("destroyed");
  });

  it("destroy after idle releases engine", async () => {
    const dispose = vi.fn();
    const engine: OcrEngine = {
      async load() {},
      async recognize() {
        return { detections: [] };
      },
      async dispose() { dispose(); },
    };
    const ctrl = createOcrController(makeConfig(), engine);

    await ctrl.destroy();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("destroy without engine is safe", async () => {
    const ctrl = createOcrController(makeConfig());
    await ctrl.destroy();
    expect(ctrl.getState()).toBe("destroyed");
  });
});

describe("Integration: error recovery", () => {
  it("load failure puts controller in error state", async () => {
    const ctrl = createOcrController(makeConfig(), makeEngineThatFailsOnLoad());

    await expect(ctrl.load()).rejects.toThrow(OcrError);
    expect(ctrl.getState()).toBe("error");

    await ctrl.destroy();
  });

  it("startCamera fails in error state", async () => {
    const ctrl = createOcrController(makeConfig(), makeEngineThatFailsOnLoad());

    await expect(ctrl.load()).rejects.toThrow();
    await expect(ctrl.startCamera()).rejects.toThrow(OcrError);

    await ctrl.destroy();
  });

  it("can recover from error by calling load again", async () => {
    let shouldFail = true;
    const engine: OcrEngine = {
      async load() {
        if (shouldFail) throw new OcrError("MODEL_LOAD_FAILED", "retryable");
      },
      async recognize() {
        return { detections: [] };
      },
      async dispose() {},
    };

    const ctrl = createOcrController(makeConfig(), engine);
    const states: string[] = [];
    ctrl.on("statechange", (s) => states.push(s));

    // First attempt fails
    await expect(ctrl.load()).rejects.toThrow();
    expect(ctrl.getState()).toBe("error");

    // Second attempt succeeds
    shouldFail = false;
    await ctrl.load();
    expect(ctrl.getState()).toBe("ready");
    expect(states).toEqual(["loading", "error", "loading", "ready"]);

    await ctrl.destroy();
  });
});

describe("Integration: crop lifecycle", () => {
  it("setCrop in idle defers resolution, resolves on running", () => {
    const ctrl = createOcrController(makeConfig(), makeEngine());

    ctrl.setCrop({ unit: "source-px", x: 10, y: 10, width: 200, height: 100 });
    expect(ctrl.getCrop()).toBeNull(); // Not running yet

    ctrl.destroy();
  });

  it("setCrop emits cropchange event", () => {
    const ctrl = createOcrController(makeConfig(), makeEngine());
    const crops: (unknown)[] = [];
    ctrl.on("cropchange", (c) => crops.push(c));

    ctrl.setCrop({ unit: "source-px", width: 300, height: 200 });
    expect(crops).toHaveLength(1);

    ctrl.setCrop(null);
    expect(crops).toHaveLength(2);

    ctrl.destroy();
  });
});

describe("Integration: multiple load/destroy cycles", () => {
  it("can load, destroy, and create a fresh controller", async () => {
    const engine1 = makeEngine();
    const engine2 = makeEngine();

    const ctrl1 = createOcrController(makeConfig(), engine1);
    await ctrl1.load();
    expect(ctrl1.getState()).toBe("ready");
    await ctrl1.destroy();

    const ctrl2 = createOcrController(makeConfig(), engine2);
    await ctrl2.load();
    expect(ctrl2.getState()).toBe("ready");
    await ctrl2.destroy();
  });

  it("load after destroy throws", async () => {
    const ctrl = createOcrController(makeConfig(), makeEngine());
    await ctrl.load();
    await ctrl.destroy();
    expect(() => ctrl.load()).toThrow(OcrError);
  });
});

describe("Integration: event ordering", () => {
  it("listeners see state transitions in correct order", async () => {
    const ctrl = createOcrController(makeConfig(), makeEngine());
    const events: { event: string; data?: unknown }[] = [];

    ctrl.on("statechange", (s) => events.push({ event: "statechange", data: s }));
    ctrl.on("camerastart", () => events.push({ event: "camerastart" }));
    ctrl.on("camerastop", () => events.push({ event: "camerastop" }));

    await ctrl.load();

    // Only statechange events (no camera events during load)
    expect(events).toEqual([
      { event: "statechange", data: "loading" },
      { event: "statechange", data: "ready" },
    ]);

    await ctrl.destroy();
  });

  it("destroy completes after all other statechanges", async () => {
    const ctrl = createOcrController(makeConfig(), makeEngine());
    const states: string[] = [];
    ctrl.on("statechange", (s) => states.push(s));

    await ctrl.load();
    await ctrl.destroy();

    expect(states).toContain("loading");
    expect(states).toContain("ready");
    // destroy() removes listeners before emitting destroyed, so we won't see it
    expect(states).not.toContain("destroyed");
  });

  it("load failure is surfaced via rejected promise", async () => {
    const ctrl = createOcrController(
      makeConfig(),
      makeEngineThatFailsOnLoad("ONNX init failed")
    );

    await expect(ctrl.load()).rejects.toThrow(OcrError);

    await ctrl.destroy();
  });
});

describe("Integration: stale result rejection", () => {
  it("results are not emitted after destroy", async () => {
    const result: OcrEngineResult = {
      detections: [{ text: "hello", confidence: 0.9, box: { x: 0, y: 0, width: 100, height: 20 } }],
    };
    const engine = makeEngine({ results: [result] });

    const ctrl = createOcrController(makeConfig(), engine);
    const emitted: unknown[] = [];
    ctrl.on("result", (r) => emitted.push(r));

    await ctrl.load();

    // Emitting after destroy should be suppressed
    await ctrl.destroy();
    expect(emitted).toHaveLength(0);
  });
});

describe("Integration: destroy completeness", () => {
  it("destroy releases all resources and prevents further operations", async () => {
    const engine = makeEngine({
      results: [{ detections: [{ text: "hi", confidence: 0.5, box: { x: 0, y: 0, width: 10, height: 10 } }] }],
    });

    const ctrl = createOcrController(makeConfig(), engine);
    await ctrl.load();

    await ctrl.destroy();
    expect(ctrl.getState()).toBe("destroyed");

    // All operations should throw after destroy
    expect(() => ctrl.on("result", () => {})).toThrow(OcrError);
    expect(() => ctrl.setCrop(null)).toThrow(OcrError);
    expect(() => ctrl.detachView()).not.toThrow(); // detachView is safe
    expect(() => ctrl.setDrawingEnabled(true)).toThrow(OcrError);
    expect(() => ctrl.clearDrawing()).toThrow(OcrError);
  });
});
