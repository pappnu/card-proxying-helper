export function isError(value: unknown): value is Error {
  return Boolean(
    value &&
    (value as Error).stack &&
    (value as Error).message &&
    typeof (value as Error).stack === "string" &&
    typeof (value as Error).message === "string",
  );
}
