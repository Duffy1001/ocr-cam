export function computeSourceToDisplayTransform(sourceWidth, sourceHeight, displayWidth, displayHeight) {
    const scaleX = displayWidth / sourceWidth;
    const scaleY = displayHeight / sourceHeight;
    return {
        scaleX,
        scaleY,
        offsetX: 0,
        offsetY: 0,
    };
}
export function transformRect(rect, transform) {
    return {
        x: Math.round(rect.x * transform.scaleX + transform.offsetX),
        y: Math.round(rect.y * transform.scaleY + transform.offsetY),
        width: Math.round(rect.width * transform.scaleX),
        height: Math.round(rect.height * transform.scaleY),
    };
}
export function transformPoint(point, transform) {
    return {
        x: point.x * transform.scaleX + transform.offsetX,
        y: point.y * transform.scaleY + transform.offsetY,
    };
}
export function translateDetectionFromCrop(detection, crop) {
    const box = {
        x: detection.box.x + crop.x,
        y: detection.box.y + crop.y,
        width: detection.box.width,
        height: detection.box.height,
    };
    const polygon = detection.polygon
        ? detection.polygon.map((p) => ({
            x: p.x + crop.x,
            y: p.y + crop.y,
        }))
        : undefined;
    return {
        ...detection,
        box,
        polygon,
    };
}
//# sourceMappingURL=coordinates.js.map