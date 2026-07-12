import { describe, it, expect } from "vitest";
import {
  computeSourceToDisplayTransform,
  transformRect,
  transformPoint,
  translateDetectionFromCrop,
} from "../../src/crop/coordinates";
import type { PixelRect, Point, ResolvedCropRegion } from "../../src/types/public";

describe("computeSourceToDisplayTransform", () => {
  it("computes scale factors", () => {
    const t = computeSourceToDisplayTransform(1920, 1080, 960, 540);
    expect(t.scaleX).toBeCloseTo(0.5);
    expect(t.scaleY).toBeCloseTo(0.5);
  });

  it("handles different aspect ratios", () => {
    const t = computeSourceToDisplayTransform(100, 100, 200, 100);
    expect(t.scaleX).toBeCloseTo(2);
    expect(t.scaleY).toBeCloseTo(1);
  });
});

describe("transformRect", () => {
  it("scales a rect", () => {
    const rect: PixelRect = { x: 10, y: 20, width: 100, height: 50 };
    const t = computeSourceToDisplayTransform(1000, 1000, 500, 500);
    const result = transformRect(rect, t);
    expect(result.x).toBe(5);
    expect(result.y).toBe(10);
    expect(result.width).toBe(50);
    expect(result.height).toBe(25);
  });
});

describe("transformPoint", () => {
  it("scales a point", () => {
    const point: Point = { x: 100, y: 200 };
    const t = computeSourceToDisplayTransform(1000, 1000, 500, 500);
    const result = transformPoint(point, t);
    expect(result.x).toBeCloseTo(50);
    expect(result.y).toBeCloseTo(100);
  });
});

describe("translateDetectionFromCrop", () => {
  it("offsets detection box by crop origin", () => {
    const crop: ResolvedCropRegion = {
      x: 100,
      y: 200,
      width: 300,
      height: 100,
      sourceWidth: 1920,
      sourceHeight: 1080,
    };

    const detection = {
      text: "hello",
      confidence: 0.95,
      box: { x: 10, y: 5, width: 80, height: 20 },
    };

    const result = translateDetectionFromCrop(detection, crop);
    expect(result.box.x).toBe(110);
    expect(result.box.y).toBe(205);
    expect(result.box.width).toBe(80);
    expect(result.box.height).toBe(20);
    expect(result.text).toBe("hello");
  });

  it("offsets polygon points by crop origin", () => {
    const crop: ResolvedCropRegion = {
      x: 50,
      y: 50,
      width: 200,
      height: 200,
      sourceWidth: 1000,
      sourceHeight: 1000,
    };

    const detection = {
      text: "test",
      confidence: 0.8,
      box: { x: 0, y: 0, width: 100, height: 30 },
      polygon: [
        { x: 10, y: 0 },
        { x: 90, y: 0 },
        { x: 95, y: 25 },
        { x: 5, y: 25 },
      ] as [Point, Point, Point, Point],
    };

    const result = translateDetectionFromCrop(detection, crop);
    expect(result.polygon![0]).toEqual({ x: 60, y: 50 });
    expect(result.polygon![1]).toEqual({ x: 140, y: 50 });
    expect(result.polygon![2]).toEqual({ x: 145, y: 75 });
    expect(result.polygon![3]).toEqual({ x: 55, y: 75 });
  });

  it("preserves other detection fields", () => {
    const crop: ResolvedCropRegion = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      sourceWidth: 500,
      sourceHeight: 500,
    };

    const detection = {
      id: "det-1",
      text: "hello",
      confidence: 0.95,
      box: { x: 0, y: 0, width: 50, height: 20 },
    };

    const result = translateDetectionFromCrop(detection, crop);
    expect(result.id).toBe("det-1");
    expect(result.confidence).toBe(0.95);
  });
});
