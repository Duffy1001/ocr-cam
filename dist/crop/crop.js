import { OcrError } from "../types/errors.js";
export function resolveCrop(config, sourceWidth, sourceHeight) {
    if (!config)
        return null;
    if (sourceWidth <= 0 || sourceHeight <= 0) {
        throw new OcrError("INVALID_CROP", `Invalid source dimensions: ${sourceWidth}x${sourceHeight}`);
    }
    if (config.unit === "normalized") {
        return resolveNormalizedCrop(config, sourceWidth, sourceHeight);
    }
    return resolveSourcePxCrop(config, sourceWidth, sourceHeight);
}
function resolveNormalizedCrop(config, sourceWidth, sourceHeight) {
    validateNormalizedValue(config.x, "x");
    validateNormalizedValue(config.y, "y");
    validateNormalizedValue(config.width, "width");
    validateNormalizedValue(config.height, "height");
    const x = clamp(config.x * sourceWidth, 0, sourceWidth - 1);
    const y = clamp(config.y * sourceHeight, 0, sourceHeight - 1);
    const maxX = clamp((config.x + config.width) * sourceWidth, 0, sourceWidth);
    const maxY = clamp((config.y + config.height) * sourceHeight, 0, sourceHeight);
    const w = Math.max(0, maxX - x);
    const h = Math.max(0, maxY - y);
    return {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(w),
        height: Math.round(h),
        sourceWidth,
        sourceHeight,
    };
}
function resolveSourcePxCrop(config, sourceWidth, sourceHeight) {
    if (!isFinite(config.width) || config.width <= 0) {
        throw new OcrError("INVALID_CROP", `Invalid crop width: ${config.width}`);
    }
    if (!isFinite(config.height) || config.height <= 0) {
        throw new OcrError("INVALID_CROP", `Invalid crop height: ${config.height}`);
    }
    const w = Math.min(config.width, sourceWidth);
    const h = Math.min(config.height, sourceHeight);
    let x;
    let y;
    if (config.x != null && config.y != null) {
        x = clamp(config.x, 0, sourceWidth - w);
        y = clamp(config.y, 0, sourceHeight - h);
    }
    else {
        x = Math.max(0, (sourceWidth - w) / 2);
        const anchor = config.anchor ?? "center";
        if (anchor === "top") {
            y = 0;
        }
        else if (anchor === "bottom") {
            y = Math.max(0, sourceHeight - h);
        }
        else {
            y = Math.max(0, (sourceHeight - h) / 2);
        }
    }
    return {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(w),
        height: Math.round(h),
        sourceWidth,
        sourceHeight,
    };
}
function validateNormalizedValue(value, name) {
    if (!isFinite(value)) {
        throw new OcrError("INVALID_CROP", `Invalid normalized ${name}: ${value}`);
    }
    if (value < 0 || value > 1) {
        throw new OcrError("INVALID_CROP", `Normalized ${name} must be between 0 and 1, got ${value}`);
    }
}
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
export function cropRegionToPixelRect(crop) {
    return {
        x: crop.x,
        y: crop.y,
        width: crop.width,
        height: crop.height,
    };
}
//# sourceMappingURL=crop.js.map