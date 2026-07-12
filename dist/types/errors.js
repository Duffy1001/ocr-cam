export class OcrError extends Error {
    code;
    constructor(code, message, options) {
        super(message, options);
        this.name = "OcrError";
        this.code = code;
    }
}
export function createOcrError(code, message, cause) {
    return new OcrError(code, message, { cause });
}
//# sourceMappingURL=errors.js.map