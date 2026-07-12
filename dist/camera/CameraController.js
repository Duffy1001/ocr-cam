export function createCameraController(callbacks) {
    let stream = null;
    let video = null;
    const trackHandlers = new WeakMap();
    function cleanup() {
        const s = stream;
        if (s) {
            detachTrackListeners(s);
            for (const track of s.getTracks())
                track.stop();
            stream = null;
        }
        if (video) {
            video.srcObject = null;
            video = null;
        }
    }
    function detachTrackListeners(s) {
        for (const track of s.getTracks()) {
            const handler = trackHandlers.get(track);
            if (handler) {
                track.removeEventListener("ended", handler);
                trackHandlers.delete(track);
            }
        }
    }
    function assertBrowser() {
        if (typeof navigator === "undefined" || !navigator.mediaDevices) {
            throw new Error("Camera APIs not available – requires a browser with getUserMedia support");
        }
    }
    function attachTrackListeners(s) {
        for (const track of s.getTracks()) {
            const handler = () => {
                const remaining = s.getVideoTracks().filter((t) => t.readyState !== "ended");
                if (remaining.length === 0)
                    callbacks?.onTrackEnded?.();
            };
            trackHandlers.set(track, handler);
            track.addEventListener("ended", handler);
        }
    }
    return {
        async start(constraints) {
            assertBrowser();
            if (stream) {
                return { stream, width: video?.videoWidth ?? 0, height: video?.videoHeight ?? 0 };
            }
            const defaultConstraints = {
                audio: false,
                video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
            };
            stream = await navigator.mediaDevices.getUserMedia(constraints ?? defaultConstraints);
            attachTrackListeners(stream);
            video = document.createElement("video");
            video.playsInline = true;
            video.muted = true;
            video.srcObject = stream;
            try {
                await video.play();
                // Wait for video dimensions
                if (video.videoWidth === 0 || video.videoHeight === 0) {
                    await new Promise((resolve, reject) => {
                        const onLoaded = () => {
                            video?.removeEventListener("loadeddata", onLoaded);
                            resolve();
                        };
                        video?.addEventListener("loadeddata", onLoaded);
                        setTimeout(() => {
                            video?.removeEventListener("loadeddata", onLoaded);
                            reject(new Error("Video did not load in time"));
                        }, 5000);
                    });
                }
                return { stream, width: video.videoWidth, height: video.videoHeight };
            }
            catch (err) {
                cleanup();
                throw err;
            }
        },
        stop() {
            cleanup();
        },
        getStream: () => stream,
        getVideoElement: () => video,
        isRunning: () => stream !== null,
    };
}
//# sourceMappingURL=CameraController.js.map