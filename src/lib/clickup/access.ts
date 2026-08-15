import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { isProductionRuntime } from "@/lib/sms/outboundSmsGuard";

const ALLOWED_HOSTS = ["dev.autoworx.tech", "localhost", "127.0.0.1"];

function isAllowedHost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0].toLowerCase();
  return ALLOWED_HOSTS.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
  );
}

/**
 * /clickup/reporting is an internal dev-only tool: it must never resolve on
 * the production domain even if APP_ENV is misconfigured, and it must never
 * be reachable by an unauthenticated visitor. Returns the session on success,
 * or a reason string to render/redirect on for the two failure modes.
 */
export async function checkClickupReportingAccess() {
  const headerList = await headers();
  const host = headerList.get("host");

  if (isProductionRuntime() || !isAllowedHost(host)) {
    return { allowed: false as const, reason: "not-found" as const };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { allowed: false as const, reason: "unauthenticated" as const };
  }

  return { allowed: true as const, session };
}
