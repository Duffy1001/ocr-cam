import { describe, it, expect } from "vitest";
import { TypedEventTarget } from "../../src/utilities/events";

interface TestEvents {
  ping: (value: string) => void;
  count: (value: number) => void;
}

describe("TypedEventTarget", () => {
  it("delivers events to listeners", () => {
    const target = new TypedEventTarget<TestEvents>();
    const received: string[] = [];

    target.on("ping", (v) => received.push(v));
    target.emit("ping", "hello");
    target.emit("ping", "world");

    expect(received).toEqual(["hello", "world"]);
  });

  it("returns unsubscribe function", () => {
    const target = new TypedEventTarget<TestEvents>();
    const received: string[] = [];

    const unsub = target.on("ping", (v) => received.push(v));
    target.emit("ping", "a");
    unsub();
    target.emit("ping", "b");

    expect(received).toEqual(["a"]);
  });

  it("swallows listener errors without breaking other listeners", () => {
    const target = new TypedEventTarget<TestEvents>();
    const received: string[] = [];

    target.on("ping", () => {
      throw new Error("broken");
    });
    target.on("ping", (v) => received.push(v));

    expect(() => target.emit("ping", "ok")).not.toThrow();
    expect(received).toEqual(["ok"]);
  });

  it("removeAllListeners clears everything", () => {
    const target = new TypedEventTarget<TestEvents>();
    const received: string[] = [];

    target.on("ping", (v) => received.push(v));
    target.on("count", (v) => received.push(String(v)));

    target.removeAllListeners();

    target.emit("ping", "a");
    target.emit("count", 1);

    expect(received).toEqual([]);
  });

  it("supports multiple event types", () => {
    const target = new TypedEventTarget<TestEvents>();
    const pings: string[] = [];
    const counts: number[] = [];

    target.on("ping", (v) => pings.push(v));
    target.on("count", (v) => counts.push(v));

    target.emit("ping", "hello");
    target.emit("count", 42);

    expect(pings).toEqual(["hello"]);
    expect(counts).toEqual([42]);
  });
});
