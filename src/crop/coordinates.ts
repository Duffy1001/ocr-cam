import type { Point, PixelRect, ResolvedCropRegion } from "../types/public.js";

export interface SourceToDisplayTransform {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

export interface DisplaySize {
  width: number;
  height: number;
}

export function computeSourceToDisplayTransform(
  sourceWidth: number,
  sourceHeight: number,
  displayWidth: number,
  displayHeight: number
): SourceToDisplayTransform {
  const scaleX = displayWidth / sourceWidth;
  const scaleY = displayHeight / sourceHeight;

  return {
    scaleX,
    scaleY,
    offsetX: 0,
    offsetY: 0,
  };
}

export function transformRect(
  rect: PixelRect,
  transform: SourceToDisplayTransform
): PixelRect {
  return {
    x: Math.round(rect.x * transform.scaleX + transform.offsetX),
    y: Math.round(rect.y * transform.scaleY + transform.offsetY),
    width: Math.round(rect.width * transform.scaleX),
    height: Math.round(rect.height * transform.scaleY),
  };
}

export function transformPoint(
  point: Point,
  transform: SourceToDisplayTransform
): Point {
  return {
    x: point.x * transform.scaleX + transform.offsetX,
    y: point.y * transform.scaleY + transform.offsetY,
  };
}

export function translateDetectionFromCrop(
  detection: import("../types/public.js").OcrDetection,
  crop: ResolvedCropRegion
): import("../types/public.js").OcrDetection {
  const box: PixelRect = {
    x: detection.box.x + crop.x,
    y: detection.box.y + crop.y,
    width: detection.box.width,
    height: detection.box.height,
  };

  const polygon = detection.polygon
    ? (detection.polygon.map((p) => ({
        x: p.x + crop.x,
        y: p.y + crop.y,
      })) as [Point, Point, Point, Point])
    : undefined;

  return {
    ...detection,
    box,
    polygon,
  };
}
