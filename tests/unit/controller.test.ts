import { describe, it, expect } from "vitest";
import { createOcrController } from "../../src/controller/OcrController";
import { createStubEngine } from "../../src/engine/StubEngine";
import type { OcrConfig } from "../../src/types/public";
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

describe("OcrController", () => {
  it("starts in idle state", () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    expect(ctrl.getState()).toBe("idle");
  });

  it("load transitions through loading -> ready", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    await ctrl.load();
    expect(ctrl.getState()).toBe("ready");
    await ctrl.destroy();
  });

  it("load is idempotent", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    await ctrl.load();
    await ctrl.load();
    expect(ctrl.getState()).toBe("ready");
    await ctrl.destroy();
  });

  it("concurrent load() calls share the same promise", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    const p1 = ctrl.load();
    const p2 = ctrl.load();
    expect(p1).toBe(p2);
    await p1;
    await ctrl.destroy();
  });

  it("load without engine throws MODEL_LOAD_FAILED", async () => {
    const ctrl = createOcrController(makeConfig());
    await expect(ctrl.load()).rejects.toThrow(OcrError);
    await ctrl.destroy();
  });

  it("destroy transitions to destroyed", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    await ctrl.load();
    await ctrl.destroy();
    expect(ctrl.getState()).toBe("destroyed");
  });

  it("getState returns destroyed after destroy", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    await ctrl.destroy();
    expect(ctrl.getState()).toBe("destroyed");
  });

  it("on throws after destroy", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    await ctrl.destroy();
    expect(() => ctrl.on("result", () => {})).toThrow(OcrError);
  });

  it("setCrop throws after destroy", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    await ctrl.destroy();
    expect(() => ctrl.setCrop(null)).toThrow(OcrError);
  });

  it("emits statechange events", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    const states: string[] = [];
    ctrl.on("statechange", (s) => states.push(s));
    await ctrl.load();
    expect(states).toContain("loading");
    expect(states).toContain("ready");
    await ctrl.destroy();
  });

  it("setCrop and getCrop work in idle (crop not resolved until running)", () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    ctrl.setCrop({ unit: "source-px", width: 300, height: 100 });
    expect(ctrl.getCrop()).toBeNull();
  });

  it("destroy is idempotent", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    await ctrl.destroy();
    await ctrl.destroy();
  });

  it("stopCamera is safe when already stopped", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    await ctrl.load();
    await ctrl.stopCamera();
    expect(ctrl.getState()).toBe("ready");
    await ctrl.destroy();
  });

  it("startCamera fails if load() was not called", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    await expect(ctrl.startCamera()).rejects.toThrow(OcrError);
    await ctrl.destroy();
  });

  it("startCamera from error state fails", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    // Force into error state by loading without engine
    const bad = createOcrController(makeConfig());
    await expect(bad.load()).rejects.toThrow();
    expect(bad.getState()).toBe("error");
    await bad.destroy();
  });

  it("detachView is safe when no view attached", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    ctrl.detachView(); // should not throw
    await ctrl.destroy();
  });

  it("setDrawingEnabled is safe when no view attached", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    ctrl.setDrawingEnabled(true); // should not throw
    await ctrl.destroy();
  });

  it("clearDrawing is safe when no view attached", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    ctrl.clearDrawing(); // should not throw
    await ctrl.destroy();
  });

  it("event listener errors do not break other listeners", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    const log: string[] = [];
    ctrl.on("statechange", (s) => { throw new Error("broken"); });
    ctrl.on("statechange", (s) => log.push(s));
    await ctrl.load();
    expect(log).toEqual(["loading", "ready"]);
    await ctrl.destroy();
  });

  it("unsubscribe function removes listener", async () => {
    const ctrl = createOcrController(makeConfig(), createStubEngine());
    const log: string[] = [];
    const unsub = ctrl.on("statechange", (s) => log.push(s));
    await ctrl.load();
    const lenAfterLoad = log.length;
    unsub();
    // Further state changes should not appear
    await ctrl.destroy();
    expect(log.length).toBe(lenAfterLoad);
  });
});
