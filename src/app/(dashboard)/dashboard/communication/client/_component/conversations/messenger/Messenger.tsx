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

  const clientProfile = await db.facebookClientProfile.findFirst({
    where: { clientId },
  });

  if (!clientProfile) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-center text-sm text-zinc-500">
          This client has not started a Messenger conversation yet.
          Conversations begin when the client messages your Facebook Page.
        </p>
      </div>
    );
  }

  const lastClientMessage = await db.messengerMessage.findFirst({
    where: { clientId, sentBy: "Client" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const windowClosed =
    !lastClientMessage ||
    // eslint-disable-next-line react-hooks/purity
    Date.now() - new Date(lastClientMessage.createdAt).getTime() >
      24 * 60 * 60 * 1000;

  return (
    <div className="relative h-full">
      <MessengerContainer clientId={clientId} windowClosed={windowClosed} />
    </div>
  );
}
