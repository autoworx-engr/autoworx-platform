import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import RedirectToSettings from "../mailgun/RedirectToSettings";
import MessengerContainer from "./MessengerContainer";

export default async function Messenger({ clientId }: { clientId: number }) {
  const companyId = await getCompanyId();

  const facebookPage = await db.facebookPage.findFirst({
    where: { companyId, isActive: true },
  });

  if (!facebookPage) {
    return (
      <RedirectToSettings
        message="Connect a Facebook Page to enable Messenger conversations."
        link="/dashboard/settings/communications"
      />
    );
  }

  return (
    <div className="relative h-full">
      <MessengerContainer clientId={clientId} />
    </div>
  );
}
