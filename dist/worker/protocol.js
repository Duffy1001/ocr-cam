export function serializeError(err) {
    if (err instanceof Error) {
        return { code: err.code ?? "UNKNOWN", message: err.message };
    }
    return { code: "UNKNOWN", message: String(err) };
}
//# sourceMappingURL=protocol.js.map