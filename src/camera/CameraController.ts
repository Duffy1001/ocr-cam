export interface CameraControllerCallbacks {
  onTrackEnded?: () => void;
}

export interface CameraController {
  start(constraints?: MediaStreamConstraints): Promise<{ stream: MediaStream; width: number; height: number }>;
  stop(): void;
  getStream(): MediaStream | null;
  getVideoElement(): HTMLVideoElement | null;
  isRunning(): boolean;
}

export function createCameraController(callbacks?: CameraControllerCallbacks): CameraController {
  let stream: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;
  const trackHandlers = new WeakMap<MediaStreamTrack, () => void>();

  function assertBrowser(): void {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      throw new Error("Camera APIs not available – requires a browser with getUserMedia support");
    }
  }

  function attachTrackListeners(s: MediaStream): void {
    for (const track of s.getTracks()) {
      const handler = () => {
        const remaining = s.getVideoTracks().filter((t) => t.readyState !== "ended");
        if (remaining.length === 0) callbacks?.onTrackEnded?.();
      };
      trackHandlers.set(track, handler);
      track.addEventListener("ended", handler);
    }
  }

  function detachTrackListeners(s: MediaStream): void {
    for (const track of s.getTracks()) {
      const handler = trackHandlers.get(track);
      if (handler) {
        track.removeEventListener("ended", handler);
        trackHandlers.delete(track);
      }
    }
  }

  return {
    async start(constraints?: MediaStreamConstraints) {
      assertBrowser();
      if (stream) {
        return { stream, width: video?.videoWidth ?? 0, height: video?.videoHeight ?? 0 };
      }

      const defaultConstraints: MediaStreamConstraints = {
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      };

      stream = await navigator.mediaDevices.getUserMedia(constraints ?? defaultConstraints);
      attachTrackListeners(stream);

      video = document.createElement("video");
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;
      await video.play();

      // Wait for video dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        await new Promise<void>((resolve, reject) => {
          const onLoaded = () => { video?.removeEventListener("loadeddata", onLoaded); resolve(); };
          video?.addEventListener("loadeddata", onLoaded);
          setTimeout(() => { video?.removeEventListener("loadeddata", onLoaded); reject(new Error("Video did not load in time")); }, 5000);
        });
      }

      return { stream, width: video.videoWidth, height: video.videoHeight };
    },

    stop() {
      const s = stream;
      if (s) {
        detachTrackListeners(s);
        for (const track of s.getTracks()) track.stop();
        stream = null;
      }
      if (video) {
        video.srcObject = null;
        video = null;
      }
    },

    getStream: () => stream,
    getVideoElement: () => video,
    isRunning: () => stream !== null,
  };
}
