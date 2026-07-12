// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class TypedEventTarget {
    listeners = new Map();
    on(event, listener) {
        let set = this.listeners.get(event);
        if (!set) {
            set = new Set();
            this.listeners.set(event, set);
        }
        set.add(listener);
        return () => {
            set.delete(listener);
            if (set.size === 0) {
                this.listeners.delete(event);
            }
        };
    }
    emit(event, ...args) {
        const set = this.listeners.get(event);
        if (!set)
            return;
        for (const listener of [...set]) {
            try {
                listener(...args);
            }
            catch {
                // Swallow listener errors to prevent one broken consumer from
                // breaking the OCR loop or other listeners.
            }
        }
    }
    removeAllListeners() {
        this.listeners.clear();
    }
}
//# sourceMappingURL=events.js.map