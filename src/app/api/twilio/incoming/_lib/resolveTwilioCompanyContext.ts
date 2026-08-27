import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";

export type TwilioCompanyContext = {
  twilioCredentials: NonNullable<
    Awaited<ReturnType<typeof db.twilioCredentials.findFirst>>
  >;
  company: {
    id: number;
    name: string | null;
    callForwardingNumber: string | null;
    callWhisperEnabled: boolean | null;
  };
  entitlements: Awaited<ReturnType<typeof getCompanyEntitlements>>;
};

// Shared by both the initial incoming-call webhook and the DTMF gather
// callback — each is a separate stateless request from Twilio, so both need
// to re-resolve the company from the dialed number.
export async function resolveTwilioCompanyContext(
  to: string,
): Promise<TwilioCompanyContext | null> {
  // Match the Twilio number exactly (E.164 with or without leading "+") —
  // `contains` would collide when one tenant's number is a substring of
  // another's.
  const toWithPlus = to.startsWith("+") ? to : `+${to}`;
  const toWithoutPlus = to.replace(/^\+/, "");

  const twilioCredentials = await db.twilioCredentials.findFirst({
    where: { phoneNumber: { in: [toWithPlus, toWithoutPlus] } },
  });
  if (!twilioCredentials) return null;

  const company = await db.company.findUnique({
    where: { id: twilioCredentials.companyId },
    select: {
      id: true,
      name: true,
      callForwardingNumber: true,
      callWhisperEnabled: true,
    },
  });
  if (!company) return null;

  const entitlements = await getCompanyEntitlements(company.id);

  return { twilioCredentials, company, entitlements };
}
