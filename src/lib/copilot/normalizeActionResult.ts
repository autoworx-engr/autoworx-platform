export type NormalizedResult<T = unknown> =
  | { ok: true; data: T; message?: string }
  | {
      ok: false;
      error: string;
      code?:
        | "permission_denied"
        | "validation"
        | "not_found"
        | "external_error"
        | "unknown";
    };

/**
 * Normalizes server action responses to a single shape for the copilot
 * tool dispatcher. Handles 3 response shapes:
 *   1. New ServerAction discriminated union: { type: "success"|"error", data?, message? }
 *   2. Old shape: { success: boolean, message?: string, data?: unknown }
 *   3. Thrown errors / { error: string } shape
 */
export function normalizeActionResult<T>(raw: unknown): NormalizedResult<T> {
  if (raw === null || raw === undefined) {
    return { ok: false, error: "Action returned nothing", code: "unknown" };
  }

  // Shape 1: new ServerAction discriminated union
  if (isNewShape(raw)) {
    if (raw.type === "success") {
      return {
        ok: true,
        data: (raw as { data?: T }).data as T,
        message: raw.message,
      };
    }
    return {
      ok: false,
      error: raw.message ?? "Action failed",
      code: "unknown",
    };
  }

  // Shape 2: old { success, message, data? } shape
  if (isOldShape(raw)) {
    if (raw.success) {
      return {
        ok: true,
        data: (raw as { data?: T }).data as T,
        message: (raw as { message?: string }).message,
      };
    }
    return {
      ok: false,
      error: (raw as { message?: string }).message ?? "Action failed",
      code: "unknown",
    };
  }

  // Shape 3: { error: string } object
  if (isErrorObject(raw)) {
    return { ok: false, error: raw.error, code: "unknown" };
  }

  // Unknown shape — fail safe, warn in dev
  console.warn(
    "[normalizeActionResult] Unrecognized action result shape:",
    JSON.stringify(raw).slice(0, 200),
  );
  return { ok: false, error: "Unknown response from action", code: "unknown" };
}

/**
 * Converts thrown errors / unknown values into NormalizedResult<never>.
 * Maps well-known Prisma errors to typed codes:
 *   P2002 → "validation" (unique constraint — "already exists")
 *   P2025 → "not_found"
 */
export function normalizeError(
  err: unknown,
): Extract<NormalizedResult, { ok: false }> {
  if (isPrismaError(err)) {
    if (err.code === "P2002") {
      return { ok: false, error: "Record already exists.", code: "validation" };
    }
    if (err.code === "P2025") {
      return { ok: false, error: "Record not found.", code: "not_found" };
    }
  }

  if (err instanceof Error) {
    return { ok: false, error: err.message, code: "unknown" };
  }

  if (typeof err === "string") {
    return { ok: false, error: err, code: "unknown" };
  }

  return {
    ok: false,
    error: "An unexpected error occurred.",
    code: "unknown",
  };
}

// ── Type guards ──────────────────────────────────────────────────────────────

function isNewShape(
  v: unknown,
): v is { type: "success" | "error"; message?: string } {
  return (
    typeof v === "object" &&
    v !== null &&
    "type" in v &&
    ((v as { type: unknown }).type === "success" ||
      (v as { type: unknown }).type === "error")
  );
}

function isOldShape(v: unknown): v is { success: boolean } {
  return (
    typeof v === "object" &&
    v !== null &&
    "success" in v &&
    typeof (v as { success: unknown }).success === "boolean"
  );
}

function isErrorObject(v: unknown): v is { error: string } {
  return (
    typeof v === "object" &&
    v !== null &&
    "error" in v &&
    typeof (v as { error: unknown }).error === "string"
  );
}

function isPrismaError(err: unknown): err is { code: string; meta?: unknown } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
  );
}
