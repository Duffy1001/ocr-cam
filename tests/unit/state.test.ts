import { describe, it, expect } from "vitest";
import {
  createStateMachine,
} from "../../src/controller/state";
import { OcrState, isValidTransition } from "../../src/types/state";
import { OcrError } from "../../src/types/errors";

describe("state machine", () => {
  it("starts in idle", () => {
    const sm = createStateMachine();
    expect(sm.getState()).toBe("idle");
  });

  it("transitions from idle to loading", () => {
    const sm = createStateMachine();
    sm.transition("loading");
    expect(sm.getState()).toBe("loading");
  });

  it("rejects invalid transition", () => {
    const sm = createStateMachine();
    expect(() => sm.transition("running")).toThrow(OcrError);
  });

  it("canTransition returns true for valid transitions", () => {
    const sm = createStateMachine();
    expect(sm.canTransition("loading")).toBe(true);
    expect(sm.canTransition("running")).toBe(false);
  });

  it("tracks full lifecycle: idle -> loading -> ready -> starting-camera -> running", () => {
    const sm = createStateMachine();
    sm.transition("loading");
    sm.transition("ready");
    sm.transition("starting-camera");
    sm.transition("running");
    expect(sm.getState()).toBe("running");
  });

  it("allows stopping during camera startup", () => {
    const sm = createStateMachine("starting-camera");
    expect(sm.canTransition("stopping-camera")).toBe(true);
    sm.transition("stopping-camera");
    expect(sm.getState()).toBe("stopping-camera");
    sm.transition("ready");
    expect(sm.getState()).toBe("ready");
  });

  it("tracks stopping: running -> stopping-camera -> ready", () => {
    const sm = createStateMachine("running");
    sm.transition("stopping-camera");
    sm.transition("ready");
    expect(sm.getState()).toBe("ready");
  });

  it("allows error from any active state", () => {
    for (const state of ["idle", "loading", "ready", "starting-camera", "running", "stopping-camera"]) {
      const sm = createStateMachine(state as OcrState);
      expect(sm.canTransition("error")).toBe(true);
    }
  });

  it("allows destroyed from any state", () => {
    for (const state of ["idle", "loading", "ready", "starting-camera", "running", "stopping-camera", "error"]) {
      const sm = createStateMachine(state as OcrState);
      expect(sm.canTransition("destroyed")).toBe(true);
    }
  });

  it("destroyed state has no transitions", () => {
    const sm = createStateMachine("destroyed");
    expect(sm.canTransition("idle")).toBe(false);
    expect(sm.canTransition("error")).toBe(false);
    expect(sm.canTransition("destroyed")).toBe(false);
  });

  it("error state can recover to idle", () => {
    const sm = createStateMachine("error");
    sm.transition("idle");
    expect(sm.getState()).toBe("idle");
  });

  it("error state can recover to loading", () => {
    const sm = createStateMachine("error");
    sm.transition("loading");
    expect(sm.getState()).toBe("loading");
  });

  it("error thrown has correct code", () => {
    const sm = createStateMachine();
    try {
      sm.transition("running");
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(OcrError);
      expect((e as OcrError).code).toBe("INVALID_STATE");
    }
  });
});

describe("isValidTransition", () => {
  it("returns true for all valid transitions", () => {
    expect(isValidTransition("idle", "loading")).toBe(true);
    expect(isValidTransition("idle", "error")).toBe(true);
    expect(isValidTransition("idle", "destroyed")).toBe(true);
    expect(isValidTransition("loading", "ready")).toBe(true);
    expect(isValidTransition("loading", "error")).toBe(true);
    expect(isValidTransition("ready", "starting-camera")).toBe(true);
    expect(isValidTransition("starting-camera", "running")).toBe(true);
    expect(isValidTransition("starting-camera", "stopping-camera")).toBe(true);
    expect(isValidTransition("running", "stopping-camera")).toBe(true);
    expect(isValidTransition("stopping-camera", "ready")).toBe(true);
    expect(isValidTransition("error", "idle")).toBe(true);
  });

  it("returns false for invalid transitions", () => {
    expect(isValidTransition("idle", "running")).toBe(false);
    expect(isValidTransition("idle", "ready")).toBe(false);
    expect(isValidTransition("running", "idle")).toBe(false);
    expect(isValidTransition("running", "loading")).toBe(false);
    expect(isValidTransition("destroyed", "idle")).toBe(false);
  });
});
