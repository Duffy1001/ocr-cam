export interface CleanupHandle {
    register(fn: () => void | Promise<void>): void;
    run(): Promise<void>;
    reset(): void;
}
export declare function createCleanupHandle(): CleanupHandle;
//# sourceMappingURL=cleanup.d.ts.map