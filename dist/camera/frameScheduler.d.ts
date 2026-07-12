export interface FrameSchedulerCallbacks {
    onFrame: (timestamp: number) => void;
}
export interface FrameScheduler {
    start(video: HTMLVideoElement, callbacks: FrameSchedulerCallbacks): void;
    stop(): void;
    isRunning(): boolean;
}
export declare function createFrameScheduler(maxFps?: number): FrameScheduler;
//# sourceMappingURL=frameScheduler.d.ts.map