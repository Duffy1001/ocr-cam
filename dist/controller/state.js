import { isValidTransition } from "../types/state.js";
import { OcrError } from "../types/errors.js";
export function createStateMachine(initial = "idle") {
    let current = initial;
    return {
        getState() {
            return current;
        },
        transition(to) {
            if (!isValidTransition(current, to)) {
                throw new OcrError("INVALID_STATE", `Cannot transition from "${current}" to "${to}"`);
            }
            current = to;
        },
        canTransition(to) {
            return isValidTransition(current, to);
        },
    };
}
//# sourceMappingURL=state.js.map