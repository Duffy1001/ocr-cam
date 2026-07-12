import { describe, it, expect } from "vitest";
import { createStubEngine } from "../../src/engine/StubEngine";
import type { OcrEngineResult } from "../../src/types/public";
import type { OcrInputFrame } from "../../src/types/internal";

function makeFrame(): OcrInputFrame {
  return { imageData: {} as ImageData, width: 1, height: 1 };
}

const defaultCtx = { sessionId: 1, frameId: 1, timestamp: 0, crop: null, sourceSize: { width: 1, height: 1 } };

describe("StubEngine", () => {
  it("loads without error", async () => {
    const engine = createStubEngine();
    await expect(engine.load()).resolves.toBeUndefined();
    await engine.dispose();
  });

  it("returns empty results by default", async () => {
    const engine = createStubEngine();
    await engine.load();
    const result = await engine.recognize(makeFrame(), defaultCtx);
    expect(result.detections).toEqual([]);
    await engine.dispose();
  });

  it("cycles through configured results", async () => {
    const results: OcrEngineResult[] = [
      { detections: [{ text: "first", confidence: 0.9, box: { x: 0, y: 0, width: 10, height: 10 } }] },
      { detections: [{ text: "second", confidence: 0.8, box: { x: 0, y: 0, width: 10, height: 10 } }] },
    ];
    const engine = createStubEngine({ results });
    await engine.load();

    const r1 = await engine.recognize(makeFrame(), defaultCtx);
    const r2 = await engine.recognize(makeFrame(), defaultCtx);

    expect(r1.detections[0]!.text).toBe("first");
    expect(r2.detections[0]!.text).toBe("second");

    const r3 = await engine.recognize(makeFrame(), defaultCtx);
    expect(r3.detections[0]!.text).toBe("first");

    await engine.dispose();
  });

  it("throws if not loaded", async () => {
    const engine = createStubEngine();
    await expect(
      engine.recognize(makeFrame(), defaultCtx)
    ).rejects.toThrow("Engine not loaded");
  });

  it("simulates delay", async () => {
    const engine = createStubEngine({ delay: 50 });
    await engine.load();
    const start = Date.now();
    await engine.recognize(makeFrame(), defaultCtx);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
    await engine.dispose();
  });

  it("dispose resets state", async () => {
    const engine = createStubEngine({ results: [{ detections: [{ text: "a", confidence: 1, box: { x: 0, y: 0, width: 1, height: 1 } }] }] });
    await engine.load();
    await engine.recognize(makeFrame(), defaultCtx);
    await engine.dispose();

    await engine.load();
    await expect(engine.recognize(makeFrame(), defaultCtx)).resolves.toBeDefined();
    await engine.dispose();
  });
});
