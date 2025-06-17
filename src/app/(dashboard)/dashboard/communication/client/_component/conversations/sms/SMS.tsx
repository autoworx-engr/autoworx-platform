import { db } from "@/lib/db";
import getSms from "../../../_actions/getSms";
import SmsContainer from "./SmsContainer";
import { getCompanyId } from "@/lib/companyId";
import RedirectToSettings from "../mailgun/RedirectToSettings";

export default async function SMS({ clientId }: { clientId: number }) {
  // check if the twilio is setup
  const companyId = await getCompanyId();
  const twilio = await db.twilioCredentials.findFirst({
    where: { companyId },
  });

  if (!twilio) {
    return (
      <RedirectToSettings
        message="Twilio is not setup for this company."
        link="/dashboard/settings/communications"
      />
    );
  }

  const messages = await getSms(clientId);

  return (
    <div className="relative mb-2 h-[calc(90%-50px)] 2xl:h-[calc(100%-50px)]">
      {/* className="relative mb-2 h-[80%] 2xl:h-[85%]" */}
      <SmsContainer messages={messages} clientId={clientId} />
    </div>
  );
}
