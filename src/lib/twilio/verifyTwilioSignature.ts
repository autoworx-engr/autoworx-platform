import "server-only";
import twilio from "twilio";

type VerifyResult =
  | { ok: true; params: Record<string, string> }
  | { ok: false; reason: "missing-signature" | "invalid-signature" };

/**
 * Verify a Twilio webhook signature.
 *
 * `authToken` is the TwilioCredentials.authToken for the company that owns the
 * webhook target. Pass `null` to skip verification (e.g. during initial rollout
 * for companies that haven't backfilled the auth token yet) — verification will
 * be reported as ok with a console warning so the webhook still bridges.
 *
 * The caller must already have consumed `formData` once and pass it back as
 * `params` because Request bodies can only be read once.
 */
export async function verifyTwilioSignature(
  request: Request,
  params: Record<string, string>,
  authToken: string | null | undefined,
): Promise<VerifyResult> {
  if (!authToken) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[twilio] authToken missing; skipping webhook signature verification (configure TwilioCredentials.authToken to enable).",
      );
    }
    return { ok: true, params };
  }

  const signature = request.headers.get("x-twilio-signature");
  if (!signature) return { ok: false, reason: "missing-signature" };

  const url = request.url;
  const valid = twilio.validateRequest(authToken, signature, url, params);
  return valid
    ? { ok: true, params }
    : { ok: false, reason: "invalid-signature" };
}

/** Convert a FormData payload to the flat string map Twilio's validator expects. */
export function formDataToParams(formData: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") params[key] = value;
  });
  return params;
}
