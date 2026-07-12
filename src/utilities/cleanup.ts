export interface CleanupHandle {
  register(fn: () => void | Promise<void>): void;
  run(): Promise<void>;
  reset(): void;
}

export function createCleanupHandle(): CleanupHandle {
  const fns: Array<() => void | Promise<void>> = [];
  let ran = false;

  return {
    register(fn) {
      if (ran) {
        throw new Error("Cleanup handle already executed");
      }
      fns.push(fn);
    },

    async run() {
      if (ran) return;
      ran = true;
      const errors: unknown[] = [];
      for (const fn of [...fns].reverse()) {
        try {
          await fn();
        } catch (e) {
          errors.push(e);
        }
      }
      fns.length = 0;
      if (errors.length > 0) {
        throw new AggregateError(errors, "Cleanup errors");
      }
    },

    reset() {
      ran = false;
      fns.length = 0;
    },
  };
}
