import { describe, it, expect } from "vitest";
import {
  nms,
  extractBoxesFromProbabilityMap,
  boxesToDetections,
  ctcGreedyDecode,
  type DetectionBox,
} from "../../src/engine/postprocess";

describe("nms", () => {
  it("keeps non-overlapping boxes", () => {
    const boxes: DetectionBox[] = [
      { x: 0, y: 0, width: 10, height: 10, confidence: 0.9 },
      { x: 100, y: 100, width: 10, height: 10, confidence: 0.8 },
    ];
    expect(nms(boxes, 0.5)).toHaveLength(2);
  });

  it("removes overlapping boxes with lower confidence", () => {
    const boxes: DetectionBox[] = [
      { x: 0, y: 0, width: 10, height: 10, confidence: 0.5 },
      { x: 1, y: 1, width: 10, height: 10, confidence: 0.9 },
    ];
    const result = nms(boxes, 0.3);
    expect(result).toHaveLength(1);
    expect(result[0]!.confidence).toBe(0.9);
  });

  it("handles empty input", () => {
    expect(nms([], 0.5)).toEqual([]);
  });

  it("handles single box", () => {
    const boxes: DetectionBox[] = [
      { x: 0, y: 0, width: 10, height: 10, confidence: 0.9 },
    ];
    expect(nms(boxes, 0.5)).toHaveLength(1);
  });
});

describe("extractBoxesFromProbabilityMap", () => {
  it("finds no detections in empty map", () => {
    const prob = new Float32Array(10 * 10);
    const boxes = extractBoxesFromProbabilityMap(prob, 10, 10, 100, 100, 0.5, 10);
    expect(boxes).toHaveLength(0);
  });

  it("finds detections in filled map", () => {
    const prob = new Float32Array(10 * 10);
    for (let y = 2; y < 8; y++) {
      for (let x = 2; x < 8; x++) {
        prob[y * 10 + x] = 0.9;
      }
    }
    const boxes = extractBoxesFromProbabilityMap(prob, 10, 10, 100, 100, 0.5, 10);
    expect(boxes.length).toBeGreaterThanOrEqual(1);
    const box = boxes[0]!;
    expect(box.x).toBeCloseTo(20, 0);
    expect(box.y).toBeCloseTo(20, 0);
    expect(box.width).toBeCloseTo(60, 0);
    expect(box.height).toBeCloseTo(60, 0);
    expect(box.confidence).toBeCloseTo(0.9, 1);
  });

  it("scales coordinates correctly", () => {
    const prob = new Float32Array(4 * 4);
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        prob[y * 4 + x] = 0.8;
      }
    }
    const boxes = extractBoxesFromProbabilityMap(prob, 4, 4, 400, 400, 0.5, 10);
    expect(boxes.length).toBeGreaterThanOrEqual(1);
    const box = boxes[0]!;
    expect(box.width).toBeCloseTo(300, 0);
    expect(box.height).toBeCloseTo(300, 0);
  });

  it("respects minBoxArea filtering", () => {
    const prob = new Float32Array(10 * 10);
    // Tiny region (1x1 pixel)
    prob[0] = 0.9;
    const boxes = extractBoxesFromProbabilityMap(prob, 10, 10, 100, 100, 0.5, 1000);
    expect(boxes).toHaveLength(0);
  });
});

describe("boxesToDetections", () => {
  it("converts boxes to OcrDetections", () => {
    const boxes: DetectionBox[] = [
      { x: 10, y: 20, width: 30, height: 40, confidence: 0.95 },
    ];
    const detections = boxesToDetections(boxes);
    expect(detections).toHaveLength(1);
    expect(detections[0]!.text).toBe("");
    expect(detections[0]!.confidence).toBe(0.95);
    expect(detections[0]!.box).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  it("rounds box coordinates", () => {
    const boxes: DetectionBox[] = [
      { x: 10.3, y: 20.7, width: 30.2, height: 40.9, confidence: 0.9 },
    ];
    const detections = boxesToDetections(boxes);
    expect(detections[0]!.box).toEqual({ x: 10, y: 21, width: 30, height: 41 });
  });
});

describe("ctcGreedyDecode", () => {
  it("decodes simple sequence", () => {
    // 3 timesteps, 4 classes: blank=0, a=1, b=2, c=3
    const logits = new Float32Array([
      0.1, 10, 0.1, 0.1,  // t=0: 'a'
      0.1, 0.1, 10, 0.1,  // t=1: 'b'
      0.1, 0.1, 0.1, 10,  // t=2: 'c'
    ]);
    expect(ctcGreedyDecode(logits, 3, 4, ["", "a", "b", "c"], 0)).toBe("abc");
  });

  it("deduplicates repeated characters", () => {
    // 'aa' -> 'a' (CTC collapses repeats)
    const logits = new Float32Array([
      0.1, 10, 0.1,  // t=0: 'a'
      0.1, 10, 0.1,  // t=1: 'a'
    ]);
    expect(ctcGreedyDecode(logits, 2, 3, ["", "a", "b"], 0)).toBe("a");
  });

  it("handles blanks correctly", () => {
    // blank, a, blank, b
    const logits = new Float32Array([
      10, 0.1, 0.1,  // t=0: blank
      0.1, 10, 0.1,  // t=1: 'a'
      10, 0.1, 0.1,  // t=2: blank
      0.1, 0.1, 10,  // t=3: 'b'
    ]);
    expect(ctcGreedyDecode(logits, 4, 3, ["", "a", "b"], 0)).toBe("ab");
  });

  it("returns empty string for all blanks", () => {
    const logits = new Float32Array([
      10, 0.1, 0.1,  // t=0: blank
      10, 0.1, 0.1,  // t=1: blank
    ]);
    expect(ctcGreedyDecode(logits, 2, 3, ["", "a", "b"], 0)).toBe("");
  });
});
