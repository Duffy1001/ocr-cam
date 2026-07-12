export type OcrState =
  | "idle"
  | "loading"
  | "ready"
  | "starting-camera"
  | "running"
  | "stopping-camera"
  | "error"
  | "destroyed";

export const VALID_TRANSITIONS: Record<OcrState, readonly OcrState[]> = {
  idle: ["loading", "error", "destroyed"],
  loading: ["ready", "error", "destroyed"],
  ready: ["starting-camera", "loading", "error", "destroyed"],
  "starting-camera": ["running", "error", "idle", "destroyed"],
  running: ["stopping-camera", "error", "destroyed"],
  "stopping-camera": ["ready", "error", "destroyed"],
  error: ["idle", "loading", "destroyed"],
  destroyed: [],
} as const;

export function isValidTransition(from: OcrState, to: OcrState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
