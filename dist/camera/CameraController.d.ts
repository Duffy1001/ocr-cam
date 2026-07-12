export interface CameraControllerCallbacks {
    onTrackEnded?: () => void;
}
export interface CameraController {
    start(constraints?: MediaStreamConstraints): Promise<{
        stream: MediaStream;
        width: number;
        height: number;
    }>;
    stop(): void;
    getStream(): MediaStream | null;
    getVideoElement(): HTMLVideoElement | null;
    isRunning(): boolean;
}
export declare function createCameraController(callbacks?: CameraControllerCallbacks): CameraController;
//# sourceMappingURL=CameraController.d.ts.map