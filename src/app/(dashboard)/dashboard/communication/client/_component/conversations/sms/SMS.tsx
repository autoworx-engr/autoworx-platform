import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import RedirectToSettings from "../mailgun/RedirectToSettings";
import SmsContainer from "./SmsContainer";

export default async function SMS({ clientId }: { clientId: number }) {
  const companyId = await getCompanyId();
  const client = await db.client.findFirst({
    where: { id: clientId },
    select: { photo: true },
  });
  const twilio = await db.twilioCredentials.findFirst({
    where: { companyId },
  });
  const infobipConfig = await db.infobipConfig.findFirst({
    where: { companyId },
  });
  const entitlements = await getCompanyEntitlements(companyId);
  const canUseSms = entitlements?.canUseSms ?? false;

  if (!twilio && !infobipConfig) {
    return (
      <RedirectToSettings
        message="SMS gateway must be configured to send SMS."
        link="/dashboard/settings/communications"
      />
    );
  }

  return (
    <div className="relative  h-full">
      {/* className="relative mb-2 h-[80%] 2xl:h-[85%]" */}
      <SmsContainer
        clientId={clientId}
        canUseSms={canUseSms}
        clientPhoto={client?.photo}
      />
    </div>
  );
}
