import { db } from "@/lib/db";
import type { AuditActor } from "@prisma/client";

export type AuditEntry = {
  actor: AuditActor;
  action: string;
  userId: number;
  companyId: number;
  resourceType?: string;
  resourceId?: string | number;
  input?: unknown;
  output?: unknown;
  success: boolean;
  errorMessage?: string;
  latencyMs?: number;
  ipAddress?: string;
  userAgent?: string;
  copilotSessionId?: string;
};

/**
 * PII field names to redact in audit log input/output JSON.
 * Values are replaced with "[REDACTED]"; field names are kept for debugging.
 * IDs (clientId, invoiceId, etc.) are NOT PII and are intentionally not listed.
 */
const PII_FIELDS = new Set([
  "phone",
  "phonenumber",
  "mobile",
  "email",
  "password",
  "ssn",
  "creditcard",
  "cardnumber",
]);

/**
 * Recursively redact PII field values from an arbitrary JSON-serializable
 * object. Field name matching is case-insensitive. Preserves structure so
 * debugging is still possible.
 */
export function redactPii(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object" && !Array.isArray(obj)) return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactPii);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (PII_FIELDS.has(key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = redactPii(value);
    }
  }
  return result;
}

/**
 * Write an audit log entry. Always call this helper instead of writing
 * to db.auditLog directly — PII redaction and shape consistency are enforced.
 *
 * NEVER throws. If the DB write fails, the error is console.errored but
 * the calling action proceeds. Audit log failures must not block users.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const inputJson =
      entry.input !== undefined
        ? JSON.stringify(redactPii(entry.input))
        : undefined;

    const outputJson =
      entry.output !== undefined
        ? JSON.stringify(redactPii(entry.output))
        : undefined;

    await db.auditLog.create({
      data: {
        actor: entry.actor,
        action: entry.action,
        userId: entry.userId,
        companyId: entry.companyId,
        resourceType: entry.resourceType,
        resourceId:
          entry.resourceId !== undefined ? String(entry.resourceId) : undefined,
        inputJson,
        outputJson,
        success: entry.success,
        errorMessage: entry.errorMessage,
        latencyMs: entry.latencyMs,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        copilotSessionId: entry.copilotSessionId,
      },
    });
  } catch (err) {
    console.error("[writeAuditLog] DB write failed — audit skipped:", err);
  }
}
