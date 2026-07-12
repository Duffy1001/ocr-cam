import { describe, it, expect } from "vitest";
import { preprocessImage, cropImageData } from "../../src/engine/preprocess";

if (typeof globalThis.ImageData === "undefined") {
  // @ts-expect-error polyfill
  globalThis.ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  };
}

function makeImageData(width: number, height: number, fill = 128): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill;
    data[i + 1] = fill;
    data[i + 2] = fill;
    data[i + 3] = 255;
  }
  return new ImageData(data, width, height);
}

describe("preprocessImage", () => {
  it("produces correct tensor dimensions", () => {
    const input = makeImageData(100, 100);
    const result = preprocessImage(input, 64, 64);
    expect(result.width).toBe(64);
    expect(result.height).toBe(64);
    expect(result.tensorData.length).toBe(3 * 64 * 64);
  });

  it("normalizes pixel values with PaddleOCR (x/255 - 0.5) / 0.5", () => {
    const input = makeImageData(10, 10, 255);
    const result = preprocessImage(input, 10, 10);
    // (255/255 - 0.5) / 0.5 = 1.0
    expect(result.tensorData[0]).toBeCloseTo(1.0, 5);
    // pixel=0 → (0 - 0.5) / 0.5 = -1.0
    const input2 = makeImageData(10, 10, 0);
    const result2 = preprocessImage(input2, 10, 10);
    expect(result2.tensorData[0]).toBeCloseTo(-1.0, 5);
  });

  it("handles different input and output sizes", () => {
    const input = makeImageData(200, 100);
    const result = preprocessImage(input, 320, 640);
    expect(result.tensorData.length).toBe(3 * 640 * 320);
  });

  it("uses bilinear interpolation for resize", () => {
    const w = 4, h = 2;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const val = Math.round((x / (w - 1)) * 255);
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = 255;
      }
    }
    const img = new ImageData(data, w, h);
    const result = preprocessImage(img, 2, 2);
    const leftVal = result.tensorData[0]!;
    const rightVal = result.tensorData[1]!;
    expect(leftVal).toBeLessThan(rightVal);
  });
});

describe("cropImageData", () => {
  it("crops a sub-region from ImageData", () => {
    const src = makeImageData(10, 10, 200);
    const cropped = cropImageData(src, 2, 3, 4, 5);
    expect(cropped.width).toBe(4);
    expect(cropped.height).toBe(5);
  });

  it("clamps crop to source bounds", () => {
    const src = makeImageData(10, 10);
    const cropped = cropImageData(src, 8, 8, 10, 10);
    expect(cropped.width).toBe(2);
    expect(cropped.height).toBe(2);
  });

  it("returns 1x1 for out-of-bounds crop", () => {
    const src = makeImageData(10, 10);
    const cropped = cropImageData(src, 100, 100, 5, 5);
    expect(cropped.width).toBe(1);
    expect(cropped.height).toBe(1);
  });
});
