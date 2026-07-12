/**
 * Image preprocessing for ONNX inference.
 *
 * PaddleOCR default normalization:
 *   (pixel / 255 - 0.5) / 0.5  →  maps to [-1, 1]
 *
 * Model assumptions (documented here and in the README):
 *   - Input layout: NCHW (batch, channels, height, width)
 *   - Input type:   float32
 *   - Color order:  RGB
 *   - Pixel range:  [-1, 1] after (x/255 - 0.5) / 0.5
 *   - Resize:       bilinear interpolation to model input dimensions
 */

export interface PreprocessedImage {
  tensorData: Float32Array;
  width: number;
  height: number;
  /** For detector: actual resized width before padding */
  resizeW?: number;
  /** For detector: actual resized height before padding */
  resizeH?: number;
  /** For detector: horizontal offset of resized image in padded tensor */
  offsetX?: number;
  /** For detector: vertical offset of resized image in padded tensor */
  offsetY?: number;
}

const PADDLE_SCALE = 0.5;
const PADDLE_MEAN = 0.5;

/**
 * Read an ImageData or draw an ImageBitmap onto a canvas and return RGBA pixel data.
 */
export function readImageData(
  source: ImageData | ImageBitmap,
  width: number,
  height: number
): ImageData {
  if (source instanceof ImageData) return source;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot create OffscreenCanvas 2D context");
  ctx.drawImage(source, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

/**
 * Preprocess RGBA ImageData to an NCHW float32 tensor for ONNX inference.
 *
 * Steps:
 *   1. Bilinear resize to (targetWidth, targetHeight)
 *   2. Convert RGBA to RGB float [0, 1]
 *   3. Layout HWC -> NCHW
 *   4. Apply PaddleOCR normalization: (x / 255 - 0.5) / 0.5
 */
export function preprocessImage(
  imageData: ImageData,
  targetWidth: number,
  targetHeight: number
): PreprocessedImage {
  const srcW = imageData.width;
  const srcH = imageData.height;
  const src = imageData.data;

  const spatialSize = targetHeight * targetWidth;
  const tensorData = new Float32Array(3 * spatialSize);

  // Bilinear resize + RGBA->RGB + HWC->NCHW + normalize in one pass
  for (let ty = 0; ty < targetHeight; ty++) {
    const srcY = (ty / targetHeight) * srcH;
    const y0 = Math.min(Math.floor(srcY), srcH - 1);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const fy = srcY - y0;

    for (let tx = 0; tx < targetWidth; tx++) {
      const srcX = (tx / targetWidth) * srcW;
      const x0 = Math.min(Math.floor(srcX), srcW - 1);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const fx = srcX - x0;

      const i00 = (y0 * srcW + x0) * 4;
      const i01 = (y0 * srcW + x1) * 4;
      const i10 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;

      for (let c = 0; c < 3; c++) {
        const v =
          (1 - fx) * (1 - fy) * (src[i00 + c] ?? 0) +
          fx * (1 - fy) * (src[i01 + c] ?? 0) +
          (1 - fx) * fy * (src[i10 + c] ?? 0) +
          fx * fy * (src[i11 + c] ?? 0);

        const normalized = v / 255;
        tensorData[c * spatialSize + ty * targetWidth + tx] =
          (normalized - PADDLE_MEAN) / PADDLE_SCALE;
      }
    }
  }

  return { tensorData, width: targetWidth, height: targetHeight };
}

/**
 * Preprocess with aspect-ratio-preserving resize + zero-padding.
 *
 * Resizes to (resizeW × targetHeight) preserving aspect ratio,
 * then pads the right side with -1.0 (PaddleOCR zero) to (padW × targetHeight).
 * Used for PaddleOCR recognition: resize to height, pad width to multiple of 32.
 */
export function preprocessImagePadded(
  imageData: ImageData,
  resizeW: number,
  targetHeight: number,
  padW: number
): PreprocessedImage {
  const srcW = imageData.width;
  const srcH = imageData.height;
  const src = imageData.data;

  const spatialSize = targetHeight * padW;
  // PaddleOCR zero after normalization: (0/255 - 0.5) / 0.5 = -1.0
  const tensorData = new Float32Array(3 * spatialSize).fill(-1.0);

  // Bilinear resize into the left portion, RGBA->RGB + HWC->NCHW + normalize
  for (let ty = 0; ty < targetHeight; ty++) {
    const srcY = (ty / targetHeight) * srcH;
    const y0 = Math.min(Math.floor(srcY), srcH - 1);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const fy = srcY - y0;

    for (let tx = 0; tx < resizeW; tx++) {
      const srcX = (tx / resizeW) * srcW;
      const x0 = Math.min(Math.floor(srcX), srcW - 1);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const fx = srcX - x0;

      const i00 = (y0 * srcW + x0) * 4;
      const i01 = (y0 * srcW + x1) * 4;
      const i10 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;

      for (let c = 0; c < 3; c++) {
        const v =
          (1 - fx) * (1 - fy) * (src[i00 + c] ?? 0) +
          fx * (1 - fy) * (src[i01 + c] ?? 0) +
          (1 - fx) * fy * (src[i10 + c] ?? 0) +
          fx * fy * (src[i11 + c] ?? 0);

        const normalized = v / 255;
        tensorData[c * spatialSize + ty * padW + tx] =
          (normalized - PADDLE_MEAN) / PADDLE_SCALE;
      }
    }
  }

  return { tensorData, width: padW, height: targetHeight };
}

/**
 * Preprocess with aspect-ratio-preserving resize + symmetric padding.
 *
 * Resizes to fit within (maxW × maxH) preserving aspect ratio,
 * then symmetrically pads with -1.0 to (padW × padH) where both dimensions
 * are rounded up to multiples of `multiple`.
 * Used for PaddleOCR detection.
 */
export function preprocessImageDetector(
  imageData: ImageData,
  maxW: number,
  maxH: number,
  multiple: number
): PreprocessedImage {
  const srcW = imageData.width;
  const srcH = imageData.height;

  // Scale to fit within maxW × maxH
  // Allow upscaling: OCR detector performance depends heavily on input scale.
  const scale = Math.min(maxW / srcW, maxH / srcH);
  const resizeW = Math.round(srcW * scale);
  const resizeH = Math.round(srcH * scale);

  // Guard against degenerate rounding.
  const safeResizeW = Math.max(1, resizeW);
  const safeResizeH = Math.max(1, resizeH);

  // Round up to multiple
  const padW = Math.ceil(safeResizeW / multiple) * multiple;
  const padH = Math.ceil(safeResizeH / multiple) * multiple;

  const src = imageData.data;
  const spatialSize = padH * padW;
  // PaddleOCR zero
  const tensorData = new Float32Array(3 * spatialSize).fill(-1.0);

  // Center the resized image in the padded tensor
  const offsetX = Math.floor((padW - safeResizeW) / 2);
  const offsetY = Math.floor((padH - safeResizeH) / 2);

  for (let ty = 0; ty < safeResizeH; ty++) {
    const srcY = (ty / safeResizeH) * srcH;
    const y0 = Math.min(Math.floor(srcY), srcH - 1);
    const y1 = Math.min(y0 + 1, srcH - 1);
    const fy = srcY - y0;

    for (let tx = 0; tx < safeResizeW; tx++) {
      const srcX = (tx / safeResizeW) * srcW;
      const x0 = Math.min(Math.floor(srcX), srcW - 1);
      const x1 = Math.min(x0 + 1, srcW - 1);
      const fx = srcX - x0;

      const i00 = (y0 * srcW + x0) * 4;
      const i01 = (y0 * srcW + x1) * 4;
      const i10 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;

      const dstX = tx + offsetX;
      const dstY = ty + offsetY;

      for (let c = 0; c < 3; c++) {
        const v =
          (1 - fx) * (1 - fy) * (src[i00 + c] ?? 0) +
          fx * (1 - fy) * (src[i01 + c] ?? 0) +
          (1 - fx) * fy * (src[i10 + c] ?? 0) +
          fx * fy * (src[i11 + c] ?? 0);

        const normalized = v / 255;
        tensorData[c * spatialSize + dstY * padW + dstX] =
          (normalized - PADDLE_MEAN) / PADDLE_SCALE;
      }
    }
  }

  return {
    tensorData,
    width: padW,
    height: padH,
    resizeW: safeResizeW,
    resizeH: safeResizeH,
    offsetX,
    offsetY,
  };
}

/**
 * Crop a sub-region from ImageData (in source pixel coordinates).
 * Returns a new ImageData of the cropped region.
 */
export function cropImageData(
  source: ImageData,
  x: number,
  y: number,
  w: number,
  h: number
): ImageData {
  const sx = Math.max(0, Math.round(x));
  const sy = Math.max(0, Math.round(y));
  const sw = Math.min(Math.round(w), source.width - sx);
  const sh = Math.min(Math.round(h), source.height - sy);

  if (sw <= 0 || sh <= 0) {
    return new ImageData(new Uint8ClampedArray(4), 1, 1);
  }

  const dst = new Uint8ClampedArray(sw * sh * 4);
  const src = source.data;
  const srcW = source.width;

  for (let row = 0; row < sh; row++) {
    const srcOff = ((sy + row) * srcW + sx) * 4;
    const dstOff = row * sw * 4;
    dst.set(src.subarray(srcOff, srcOff + sw * 4), dstOff);
  }

  return new ImageData(dst, sw, sh);
}

// ─── Image rotation helpers ────────────────────────────────────────────────

/** Rotate an ImageData 90 degrees clockwise. */
export function rotateImageData90Clockwise(imageData: ImageData): ImageData {
  const srcW = imageData.width;
  const srcH = imageData.height;
  const src = imageData.data;

  const dstW = srcH;
  const dstH = srcW;
  const dst = new Uint8ClampedArray(dstW * dstH * 4);

  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const srcIdx = (y * srcW + x) * 4;
      const dstX = dstW - 1 - y;
      const dstY = x;
      const dstIdx = (dstY * dstW + dstX) * 4;
      dst[dstIdx + 0] = src[srcIdx + 0]!;
      dst[dstIdx + 1] = src[srcIdx + 1]!;
      dst[dstIdx + 2] = src[srcIdx + 2]!;
      dst[dstIdx + 3] = src[srcIdx + 3]!;
    }
  }

  return new ImageData(dst, dstW, dstH);
}

/** Rotate an ImageData 270 degrees clockwise (90 degrees counter-clockwise). */
export function rotateImageData270Clockwise(imageData: ImageData): ImageData {
  const srcW = imageData.width;
  const srcH = imageData.height;
  const src = imageData.data;

  const dstW = srcH;
  const dstH = srcW;
  const dst = new Uint8ClampedArray(dstW * dstH * 4);

  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const srcIdx = (y * srcW + x) * 4;
      const dstX = y;
      const dstY = dstH - 1 - x;
      const dstIdx = (dstY * dstW + dstX) * 4;
      dst[dstIdx + 0] = src[srcIdx + 0]!;
      dst[dstIdx + 1] = src[srcIdx + 1]!;
      dst[dstIdx + 2] = src[srcIdx + 2]!;
      dst[dstIdx + 3] = src[srcIdx + 3]!;
    }
  }

  return new ImageData(dst, dstW, dstH);
}
