export type Result<Failure, Success> = { ok: false; value: Failure } | { ok: true; value: Success };

export const failure = <L = never, R = never>(value: L): Result<L, R> => ({ ok: false, value });

export const success = <L = never, R = never>(value: R): Result<L, R> => ({ ok: true, value });
