export interface FrameSchedulerCallbacks {
  onFrame: (timestamp: number) => void;
}

export interface FrameScheduler {
  start(video: HTMLVideoElement, callbacks: FrameSchedulerCallbacks): void;
  stop(): void;
  isRunning(): boolean;
}

export function createFrameScheduler(maxFps: number = 8): FrameScheduler {
  let running = false;
  let rafId: number | null = null;
  let callbacks: FrameSchedulerCallbacks | null = null;
  let video: HTMLVideoElement | null = null;
  const minFrameInterval = 1000 / maxFps;
  let lastFrameTime = 0;

  function onVideoFrame(_now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata): void {
    if (!running || !callbacks) return;

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
  function handleRaf(timestamp: number): void {
    if (!running || !callbacks) return;

    const elapsed = timestamp - lastFrameTime;
    if (elapsed >= minFrameInterval) {
      lastFrameTime = timestamp;
      callbacks.onFrame(timestamp);
    }

    rafId = requestAnimationFrame(handleRaf);
  }

  return {
    start(v: HTMLVideoElement, cbs: FrameSchedulerCallbacks) {
      if (running) return;
      running = true;
      video = v;
      callbacks = cbs;
      lastFrameTime = 0;

      if (v.requestVideoFrameCallback) {
        v.requestVideoFrameCallback(onVideoFrame);
      } else {
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
