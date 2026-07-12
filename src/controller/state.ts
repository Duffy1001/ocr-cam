import { OcrState, isValidTransition } from "../types/state.js";
import { OcrError } from "../types/errors.js";

export interface StateMachine {
  getState(): OcrState;
  transition(to: OcrState): void;
  canTransition(to: OcrState): boolean;
}

export function createStateMachine(initial: OcrState = "idle"): StateMachine {
  let current = initial;

  return {
    getState() {
      return current;
    },

    transition(to: OcrState) {
      if (!isValidTransition(current, to)) {
        throw new OcrError(
          "INVALID_STATE",
          `Cannot transition from "${current}" to "${to}"`
        );
      }
      current = to;
    },

    canTransition(to: OcrState) {
      return isValidTransition(current, to);
    },
  };
}
