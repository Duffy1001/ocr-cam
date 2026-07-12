import { OcrState } from "../types/state.js";
export interface StateMachine {
    getState(): OcrState;
    transition(to: OcrState): void;
    canTransition(to: OcrState): boolean;
}
export declare function createStateMachine(initial?: OcrState): StateMachine;
//# sourceMappingURL=state.d.ts.map