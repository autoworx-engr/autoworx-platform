import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import RedirectToSettings from "../mailgun/RedirectToSettings";
import MetaContainer from "./MetaContainer";

type TProps = {
  clientId: number;
  defaultPlatform?: "INSTAGRAM" | "FACEBOOK";
};

/**
 * Server Component that guards the Meta conversation view.
 *
 * Checks whether the company has an active `MetaCredentials` record. If not,
 * renders a `RedirectToSettings` prompt instead of the conversation UI so
 * the user knows they need to connect a Facebook Page first.
 *
 * @param clientId - Client to open the conversation for
 * @param defaultPlatform - Default send platform shown in `SendMeta` ("INSTAGRAM" | "FACEBOOK")
 */
export default async function Meta({
  clientId,
  defaultPlatform = "INSTAGRAM",
}: TProps) {
  const companyId = await getCompanyId();
  const credentials = await db.metaCredentials.findFirst({
    where: { companyId, isActive: true },
  });

  if (!credentials) {
    return (
      <RedirectToSettings
        message="Connect a Meta (Facebook / Instagram) account to message clients here."
        link="/dashboard/settings/communications"
      />
    );
  }

  return (
    <div className="relative h-full">
      <MetaContainer clientId={clientId} defaultPlatform={defaultPlatform} />
    </div>
  );
}
