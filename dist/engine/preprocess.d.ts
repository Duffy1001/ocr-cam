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
/**
 * Read an ImageData or draw an ImageBitmap onto a canvas and return RGBA pixel data.
 */
export declare function readImageData(source: ImageData | ImageBitmap, width: number, height: number): ImageData;
/**
 * Preprocess RGBA ImageData to an NCHW float32 tensor for ONNX inference.
 *
 * Steps:
 *   1. Bilinear resize to (targetWidth, targetHeight)
 *   2. Convert RGBA to RGB float [0, 1]
 *   3. Layout HWC -> NCHW
 *   4. Apply PaddleOCR normalization: (x / 255 - 0.5) / 0.5
 */
export declare function preprocessImage(imageData: ImageData, targetWidth: number, targetHeight: number): PreprocessedImage;
/**
 * Preprocess with aspect-ratio-preserving resize + zero-padding.
 *
 * Resizes to (resizeW × targetHeight) preserving aspect ratio,
 * then pads the right side with -1.0 (PaddleOCR zero) to (padW × targetHeight).
 * Used for PaddleOCR recognition: resize to height, pad width to multiple of 32.
 */
export declare function preprocessImagePadded(imageData: ImageData, resizeW: number, targetHeight: number, padW: number): PreprocessedImage;
/**
 * Preprocess with aspect-ratio-preserving resize + symmetric padding.
 *
 * Resizes to fit within (maxW × maxH) preserving aspect ratio,
 * then symmetrically pads with -1.0 to (padW × padH) where both dimensions
 * are rounded up to multiples of `multiple`.
 * Used for PaddleOCR detection.
 */
export declare function preprocessImageDetector(imageData: ImageData, maxW: number, maxH: number, multiple: number): PreprocessedImage;
/**
 * Crop a sub-region from ImageData (in source pixel coordinates).
 * Returns a new ImageData of the cropped region.
 */
export declare function cropImageData(source: ImageData, x: number, y: number, w: number, h: number): ImageData;
/** Rotate an ImageData 90 degrees clockwise. */
export declare function rotateImageData90Clockwise(imageData: ImageData): ImageData;
/** Rotate an ImageData 270 degrees clockwise (90 degrees counter-clockwise). */
export declare function rotateImageData270Clockwise(imageData: ImageData): ImageData;
//# sourceMappingURL=preprocess.d.ts.map