import { describe, it, expect } from "vitest";
import { resolveCrop, clamp } from "../../src/crop/crop";
import type { CropConfiguration } from "../../src/types/public";
import { OcrError } from "../../src/types/errors";

describe("clamp", () => {
  it("clamps below min", () => expect(clamp(-1, 0, 10)).toBe(0));
  it("clamps above max", () => expect(clamp(15, 0, 10)).toBe(10));
  it("passes through in range", () => expect(clamp(5, 0, 10)).toBe(5));
});

describe("resolveCrop", () => {
  describe("null crop", () => {
    it("returns null", () => {
      expect(resolveCrop(null, 1920, 1080)).toBeNull();
    });
  });

  describe("normalized crop", () => {
    it("resolves a center normalized crop", () => {
      const config: CropConfiguration = {
        unit: "normalized",
        x: 0.3,
        y: 0.4,
        width: 0.4,
        height: 0.2,
      };
      const result = resolveCrop(config, 1000, 500);
      expect(result).toEqual({
        x: 300,
        y: 200,
        width: 400,
        height: 100,
        sourceWidth: 1000,
        sourceHeight: 500,
      });
    });

    it("clamps to source bounds", () => {
      const config: CropConfiguration = {
        unit: "normalized",
        x: 0.8,
        y: 0.8,
        width: 0.4,
        height: 0.4,
      };
      const result = resolveCrop(config, 1000, 500);
      expect(result!.x).toBe(800);
      expect(result!.y).toBe(400);
      expect(result!.width).toBe(200);
      expect(result!.height).toBe(100);
    });

    it("rejects values outside 0-1", () => {
      expect(() =>
        resolveCrop(
          { unit: "normalized", x: -0.1, y: 0, width: 0.5, height: 0.5 },
          1000,
          1000
        )
      ).toThrow(OcrError);

      expect(() =>
        resolveCrop(
          { unit: "normalized", x: 0, y: 1.1, width: 0.5, height: 0.5 },
          1000,
          1000
        )
      ).toThrow(OcrError);
    });

    it("rejects non-finite values", () => {
      expect(() =>
        resolveCrop(
          { unit: "normalized", x: NaN, y: 0, width: 0.5, height: 0.5 },
          1000,
          1000
        )
      ).toThrow(OcrError);
    });

    it("rejects values with correct error code", () => {
      try {
        resolveCrop(
          { unit: "normalized", x: -0.1, y: 0, width: 0.5, height: 0.5 },
          1000,
          1000
        );
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(OcrError);
        expect((e as OcrError).code).toBe("INVALID_CROP");
      }
    });
  });

  describe("source-px crop", () => {
    it("resolves a centered crop by default", () => {
      const config: CropConfiguration = {
        unit: "source-px",
        width: 300,
        height: 100,
      };
      const result = resolveCrop(config, 1920, 1080);
      expect(result!.width).toBe(300);
      expect(result!.height).toBe(100);
      expect(result!.x).toBe(Math.round((1920 - 300) / 2));
      expect(result!.y).toBe(Math.round((1080 - 100) / 2));
    });

    it("anchors to top", () => {
      const config: CropConfiguration = {
        unit: "source-px",
        width: 300,
        height: 100,
        anchor: "top",
      };
      const result = resolveCrop(config, 1920, 1080);
      expect(result!.y).toBe(0);
    });

    it("anchors to bottom", () => {
      const config: CropConfiguration = {
        unit: "source-px",
        width: 300,
        height: 100,
        anchor: "bottom",
      };
      const result = resolveCrop(config, 1920, 1080);
      expect(result!.y).toBe(1080 - 100);
    });

    it("uses explicit position", () => {
      const config: CropConfiguration = {
        unit: "source-px",
        x: 100,
        y: 200,
        width: 300,
        height: 100,
      };
      const result = resolveCrop(config, 1920, 1080);
      expect(result!.x).toBe(100);
      expect(result!.y).toBe(200);
    });

    it("clamps to source bounds", () => {
      const config: CropConfiguration = {
        unit: "source-px",
        x: 1800,
        y: 1000,
        width: 300,
        height: 100,
      };
      const result = resolveCrop(config, 1920, 1080);
      expect(result!.x).toBe(1620);
      expect(result!.y).toBe(980);
    });

    it("clamps oversized crop to source", () => {
      const config: CropConfiguration = {
        unit: "source-px",
        width: 3000,
        height: 2000,
      };
      const result = resolveCrop(config, 1920, 1080);
      expect(result!.width).toBe(1920);
      expect(result!.height).toBe(1080);
    });

    it("rejects non-positive width", () => {
      expect(() =>
        resolveCrop(
          { unit: "source-px", width: 0, height: 100 },
          1920,
          1080
        )
      ).toThrow(OcrError);
    });

    it("rejects negative height", () => {
      expect(() =>
        resolveCrop(
          { unit: "source-px", width: 100, height: -50 },
          1920,
          1080
        )
      ).toThrow(OcrError);
    });

    it("rejects infinite values", () => {
      expect(() =>
        resolveCrop(
          { unit: "source-px", width: Infinity, height: 100 },
          1920,
          1080
        )
      ).toThrow(OcrError);
    });

    it("rejects with correct error code", () => {
      try {
        resolveCrop(
          { unit: "source-px", width: 0, height: 100 },
          1920,
          1080
        );
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(OcrError);
        expect((e as OcrError).code).toBe("INVALID_CROP");
      }
    });
  });

  describe("invalid source dimensions", () => {
    it("rejects zero source width", () => {
      expect(() =>
        resolveCrop(
          { unit: "source-px", width: 100, height: 100 },
          0,
          1080
        )
      ).toThrow(OcrError);
    });

    it("rejects negative source height", () => {
      expect(() =>
        resolveCrop(
          { unit: "source-px", width: 100, height: 100 },
          1920,
          -1
        )
      ).toThrow(OcrError);
    });
  });
});
