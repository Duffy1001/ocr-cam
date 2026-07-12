export const VALID_TRANSITIONS = {
    idle: ["loading", "error", "destroyed"],
    loading: ["ready", "error", "destroyed"],
    ready: ["starting-camera", "loading", "error", "destroyed"],
    "starting-camera": ["running", "error", "idle", "destroyed"],
    running: ["stopping-camera", "error", "destroyed"],
    "stopping-camera": ["ready", "error", "destroyed"],
    error: ["idle", "loading", "destroyed"],
    destroyed: [],
};
export function isValidTransition(from, to) {
    return VALID_TRANSITIONS[from].includes(to);
}
//# sourceMappingURL=state.js.map