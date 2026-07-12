import type { CropConfiguration, ResolvedCropRegion, PixelRect } from "../types/public.js";
export declare function resolveCrop(config: CropConfiguration | null, sourceWidth: number, sourceHeight: number): ResolvedCropRegion | null;
export declare function clamp(value: number, min: number, max: number): number;
export declare function cropRegionToPixelRect(crop: ResolvedCropRegion): PixelRect;
//# sourceMappingURL=crop.d.ts.map