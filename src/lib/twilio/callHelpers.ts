import "server-only";
import { db } from "@/lib/db";
import {
  normalizePhoneForStorage,
  phoneLookupWhereClause,
} from "@/utils/normalizePhone";

/**
 * Look up Twilio credentials by the platform phone number (the "To" of an
 * inbound webhook, or the "From" of an outbound). Uses exact-match on the
 * E.164 (+1...) and bare-digit variants instead of `contains`, which would
 * collide when one tenant's number is a suffix of another's.
 */
export async function findTwilioCredentialsByNumber(rawNumber: string) {
  const trimmed = rawNumber.trim();
  const withPlus = trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
  const withoutPlus = trimmed.replace(/^\+/, "");

  return db.twilioCredentials.findFirst({
    where: { phoneNumber: { in: [withPlus, withoutPlus] } },
  });
}

/**
 * Find a client by phone within a company, or create an "Unknown" placeholder
 * if none matches. Uses phoneLookupWhereClause (digit-only suffix match) so we
 * don't collide on substrings, and stores the number in normalized form.
 *
 * Note: `isSalesAgent` is intentionally false — the caller is a customer/lead,
 * not an internal sales agent.
 */
export async function resolveOrCreateClientByPhone({
  companyId,
  phone,
}: {
  companyId: number;
  phone: string;
}) {
  const lookup = phoneLookupWhereClause(phone);

  const existing = lookup
    ? await db.client.findFirst({
        where: { companyId, OR: lookup },
      })
    : null;

  if (existing) return existing;

  return db.client.create({
    data: {
      firstName: "Unknown",
      lastName: "Caller",
      mobile: normalizePhoneForStorage(phone),
      companyId,
      isSalesAgent: false,
    },
  });
}
