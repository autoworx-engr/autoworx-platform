import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import RedirectToSettings from "../mailgun/RedirectToSettings";
import InstagramContainer from "./InstagramContainer";

export default async function Instagram({ clientId }: { clientId: number }) {
  const companyId = await getCompanyId();

  const igAccount = await db.instagramAccount.findFirst({
    where: { companyId, isActive: true },
  });

  if (!igAccount) {
    return (
      <RedirectToSettings
        message="Connect an Instagram Professional account to enable DM conversations."
        link="/dashboard/settings/communications"
      />
    );
  }

  const clientProfile = await db.instagramClientProfile.findFirst({
    where: { clientId },
  });

  if (!clientProfile) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-center text-sm text-zinc-500">
          This client has not started an Instagram DM conversation yet.
          Conversations begin when the client messages your Instagram account.
        </p>
      </div>
    );
  }

  const lastClientMessage = await db.instagramMessage.findFirst({
    where: { clientId, sentBy: "Client" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const windowClosed =
    !lastClientMessage ||
    Date.now() - new Date(lastClientMessage.createdAt).getTime() >
      24 * 60 * 60 * 1000;

  return (
    <div className="relative h-full">
      <InstagramContainer clientId={clientId} windowClosed={windowClosed} />
    </div>
  );
}
