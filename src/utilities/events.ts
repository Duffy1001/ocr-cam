type Listener<Args extends unknown[]> = (...args: Args) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TypedEventTarget<EventMap extends { [K in keyof EventMap]: (...args: any[]) => void }> {
  private listeners = new Map<keyof EventMap, Set<Listener<any>>>();

  on<K extends keyof EventMap>(
    event: K,
    listener: EventMap[K]
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<any>);

    return () => {
      set!.delete(listener as Listener<any>);
      if (set!.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit<K extends keyof EventMap>(
    event: K,
    ...args: Parameters<EventMap[K]>
  ): void {
    const set = this.listeners.get(event);
    if (!set) return;

    for (const listener of [...set]) {
      try {
        listener(...args);
      } catch {
        // Swallow listener errors to prevent one broken consumer from
        // breaking the OCR loop or other listeners.
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
