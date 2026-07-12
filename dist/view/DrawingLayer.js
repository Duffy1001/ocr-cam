export function createDrawingLayer(canvas, callbacks) {
    let enabled = false;
    let currentStroke = null;
    const strokes = [];
    const ctx = canvas.getContext("2d");
    // Pointer event handlers
    function onPointerDown(e) {
        if (!enabled)
            return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        currentStroke = {
            points: [
                {
                    x,
                    y,
                    pressure: e.pressure,
                    timestamp: Date.now(),
                },
            ],
        };
        canvas.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e) {
        if (!enabled || !currentStroke)
            return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        currentStroke.points.push({
            x,
            y,
            pressure: e.pressure,
            timestamp: Date.now(),
        });
        renderStroke(currentStroke);
    }
    function onPointerUp(e) {
        if (!enabled || !currentStroke)
            return;
        e.preventDefault();
        if (currentStroke.points.length > 1) {
            strokes.push(currentStroke);
            callbacks?.onAnnotationChange?.(strokes);
        }
        currentStroke = null;
    }
    function renderStroke(stroke) {
        if (!ctx || stroke.points.length < 2)
            return;
        ctx.save();
        ctx.strokeStyle = "#ff4444";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        const first = stroke.points[0];
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < stroke.points.length; i++) {
            const pt = stroke.points[i];
            ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
        ctx.restore();
    }
    function renderAllStrokes() {
        if (!ctx)
            return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const stroke of strokes) {
            renderStroke(stroke);
        }
        if (currentStroke) {
            renderStroke(currentStroke);
        }
    }
    function attachListeners() {
        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);
    }
    function detachListeners() {
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerUp);
    }
    attachListeners();
    return {
        enable() {
            enabled = true;
            canvas.style.pointerEvents = "auto";
        },
        disable() {
            enabled = false;
            canvas.style.pointerEvents = "none";
            currentStroke = null;
        },
        isEnabled() {
            return enabled;
        },
        clear() {
            strokes.length = 0;
            currentStroke = null;
            renderAllStrokes();
            callbacks?.onAnnotationChange?.([]);
        },
        getStrokes() {
            return [...strokes];
        },
        destroy() {
            detachListeners();
            strokes.length = 0;
            currentStroke = null;
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        },
    };
}
//# sourceMappingURL=DrawingLayer.js.map