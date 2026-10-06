export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export function actionError(error: unknown, fallback = "Something went wrong"): {
  ok: false;
  error: string;
} {
  if (error instanceof Error && error.name === "RepositoryError") {
    return { ok: false, error: error.message };
  }
  console.error(error);
  return { ok: false, error: fallback };
}
