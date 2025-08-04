import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import RedirectToSettings from "../mailgun/RedirectToSettings";
import SmsContainer from "./SmsContainer";

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

  return (
    <div className="relative  h-full">
      {/* className="relative mb-2 h-[80%] 2xl:h-[85%]" */}
      <SmsContainer clientId={clientId} />
    </div>
  );
}
