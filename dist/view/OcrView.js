import { createDrawingLayer } from "./DrawingLayer.js";
export function createOcrView(container, video, crop, options = {}) {
    const opacity = clampOpacity(options.outsideCropOpacity ?? 0.55);
    const showBorder = options.showCropBorder ?? true;
    const showBoxes = options.showBoundingBoxes ?? true;
    const showText = options.showRecognizedText ?? false;
    // Wrapper – 100% size of container
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "position:relative;width:100%;height:100%;overflow:hidden;background:#000;";
    // Move the existing video element into the wrapper (no duplicate)
    wrapper.appendChild(video);
    video.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;";
    // Overlay canvas for crop mask + bounding boxes
    const overlayCanvas = document.createElement("canvas");
    overlayCanvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";
    const overlayCtx = overlayCanvas.getContext("2d");
    // Drawing canvas for annotations
    const drawingCanvas = document.createElement("canvas");
    drawingCanvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";
    wrapper.appendChild(overlayCanvas);
    wrapper.appendChild(drawingCanvas);
    container.appendChild(wrapper);
    const drawingLayer = createDrawingLayer(drawingCanvas);
    if (options.drawingEnabled)
        drawingLayer.enable();
    let currentResult = null;
    let currentCrop = crop;
    let resizeObserver = null;
    let destroyed = false;
    function syncCanvasSize() {
        if (destroyed)
            return;
        const rect = wrapper.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = Math.round(rect.width * dpr);
        const h = Math.round(rect.height * dpr);
        if (overlayCanvas.width !== w || overlayCanvas.height !== h) {
            overlayCanvas.width = w;
            overlayCanvas.height = h;
        }
        if (drawingCanvas.width !== w || drawingCanvas.height !== h) {
            drawingCanvas.width = w;
            drawingCanvas.height = h;
        }
        render();
    }
    function getMetrics() {
        const rect = wrapper.getBoundingClientRect();
        const dw = rect.width;
        const dh = rect.height;
        const vw = video.videoWidth || 1;
        const vh = video.videoHeight || 1;
        const srcAspect = vw / vh;
        const dispAspect = dw / dh;
        let drawW, drawH, drawX, drawY;
        if (srcAspect > dispAspect) {
            drawW = dw;
            drawH = dw / srcAspect;
            drawX = 0;
            drawY = (dh - drawH) / 2;
        }
        else {
            drawH = dh;
            drawW = dh * srcAspect;
            drawX = (dw - drawW) / 2;
            drawY = 0;
        }
        return { dw, dh, drawW, drawH, drawX, drawY, scaleX: drawW / vw, scaleY: drawH / vh };
    }
    function render() {
        if (destroyed || !overlayCtx)
            return;
        const dpr = window.devicePixelRatio || 1;
        overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        overlayCtx.clearRect(0, 0, overlayCanvas.width / dpr, overlayCanvas.height / dpr);
        const m = getMetrics();
        if (currentCrop && opacity > 0) {
            renderCropMask(overlayCtx, currentCrop, m);
        }
        if (currentResult && showBoxes) {
            renderBoundingBoxes(overlayCtx, currentResult, m);
        }
    }
    function renderCropMask(ctx, crop, m) {
        const cx = m.drawX + crop.x * m.scaleX;
        const cy = m.drawY + crop.y * m.scaleY;
        const cw = crop.width * m.scaleX;
        const ch = crop.height * m.scaleY;
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${opacity})`;
        ctx.fillRect(0, 0, m.dw, m.dh);
        ctx.clearRect(cx, cy, cw, ch);
        if (showBorder) {
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.lineWidth = 2;
            ctx.strokeRect(cx, cy, cw, ch);
        }
        ctx.restore();
    }
    function renderBoundingBoxes(ctx, result, m) {
        ctx.save();
        for (const det of result.detections) {
            const x = m.drawX + det.box.x * m.scaleX;
            const y = m.drawY + det.box.y * m.scaleY;
            const w = det.box.width * m.scaleX;
            const h = det.box.height * m.scaleY;
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            if (showText && det.text) {
                const fs = Math.max(10, Math.min(14, h * 0.25));
                ctx.font = `${fs}px monospace`;
                ctx.fillStyle = "rgba(0,255,0,0.9)";
                ctx.fillText(det.text, x + 2, y - 3);
            }
        }
        ctx.restore();
    }
    resizeObserver = new ResizeObserver(syncCanvasSize);
    resizeObserver.observe(wrapper);
    syncCanvasSize();
    return {
        updateResult(result) {
            if (destroyed)
                return;
            currentResult = result;
            render();
        },
        updateCrop(crop) {
            if (destroyed)
                return;
            currentCrop = crop;
            render();
        },
        setDrawingEnabled(enabled) {
            if (destroyed)
                return;
            enabled ? drawingLayer.enable() : drawingLayer.disable();
        },
        clearDrawing() {
            if (destroyed)
                return;
            drawingLayer.clear();
        },
        getStrokes() {
            return drawingLayer.getStrokes();
        },
        destroy() {
            if (destroyed)
                return;
            destroyed = true;
            drawingLayer.destroy();
            resizeObserver?.disconnect();
            resizeObserver = null;
            // Return the video element to its original state (unparented from wrapper)
            video.style.cssText = "";
            wrapper.remove();
        },
    };
}
function clampOpacity(v) {
    return isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
}
//# sourceMappingURL=OcrView.js.map