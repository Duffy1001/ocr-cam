import { describe, it, expect } from "vitest";
import { createCleanupHandle } from "../../src/utilities/cleanup";

describe("createCleanupHandle", () => {
  it("runs registered functions in reverse order", async () => {
    const handle = createCleanupHandle();
    const log: string[] = [];

    handle.register(() => log.push("a"));
    handle.register(() => log.push("b"));

    await handle.run();
    expect(log).toEqual(["b", "a"]);
  });

  it("only runs once", async () => {
    const handle = createCleanupHandle();
    let count = 0;

    handle.register(() => count++);
    await handle.run();
    await handle.run();

    expect(count).toBe(1);
  });

  it("collects errors and throws AggregateError", async () => {
    const handle = createCleanupHandle();

    handle.register(() => {
      throw new Error("err1");
    });
    handle.register(() => {
      throw new Error("err2");
    });

    await expect(handle.run()).rejects.toThrow(AggregateError);
  });

  it("reset allows re-running", async () => {
    const handle = createCleanupHandle();
    let count = 0;

    handle.register(() => count++);
    await handle.run();
    expect(count).toBe(1);

    handle.reset();
    handle.register(() => count++);
    await handle.run();
    expect(count).toBe(2);
  });

  it("supports async functions", async () => {
    const handle = createCleanupHandle();
    const log: string[] = [];

    handle.register(async () => {
      await new Promise((r) => setTimeout(r, 10));
      log.push("async-a");
    });
    handle.register(() => log.push("sync-b"));

    await handle.run();
    expect(log).toEqual(["sync-b", "async-a"]);
  });
});
