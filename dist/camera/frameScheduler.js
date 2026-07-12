export function createFrameScheduler(maxFps = 8) {
    let running = false;
    let rafId = null;
    let callbacks = null;
    let video = null;
    const minFrameInterval = 1000 / maxFps;
    let lastFrameTime = 0;
    function onVideoFrame(_now, metadata) {
        if (!running || !callbacks)
            return;
        const timestamp = metadata.mediaTime * 1000; // convert to ms
        const elapsed = performance.now() - lastFrameTime;
        if (elapsed >= minFrameInterval) {
            lastFrameTime = performance.now();
            callbacks.onFrame(timestamp);
        }
        // Continue the loop
        if (video?.requestVideoFrameCallback) {
            video.requestVideoFrameCallback(onVideoFrame);
        }
    }
    // Fallback using requestAnimationFrame
    function handleRaf(timestamp) {
        if (!running || !callbacks)
            return;
        const elapsed = timestamp - lastFrameTime;
        if (elapsed >= minFrameInterval) {
            lastFrameTime = timestamp;
            callbacks.onFrame(timestamp);
        }
        rafId = requestAnimationFrame(handleRaf);
    }
    return {
        start(v, cbs) {
            if (running)
                return;
            running = true;
            video = v;
            callbacks = cbs;
            lastFrameTime = 0;
            if (v.requestVideoFrameCallback) {
                v.requestVideoFrameCallback(onVideoFrame);
            }
            else {
                rafId = requestAnimationFrame(handleRaf);
            }
        },
        stop() {
            running = false;
            callbacks = null;
            video = null;
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        },
        isRunning() {
            return running;
        },
    };
}
//# sourceMappingURL=frameScheduler.js.map