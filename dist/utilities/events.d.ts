export declare class TypedEventTarget<EventMap extends {
    [K in keyof EventMap]: (...args: any[]) => void;
}> {
    private listeners;
    on<K extends keyof EventMap>(event: K, listener: EventMap[K]): () => void;
    emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): void;
    removeAllListeners(): void;
}
//# sourceMappingURL=events.d.ts.map