import { fetchMailsMailgun } from "@/actions/communication/client/fetchMailgunMails";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import MailgunMessageBox from "./MailgunMessageBox";
import RedirectToSettings from "./RedirectToSettings";

export default async function MailGunEmail({ clientId }: { clientId: number }) {
  const companyId = await getCompanyId();

  const client = await db.client.findFirst({
    where: { id: clientId },
    select: {
      email: true,
      photo: true,
    },
  });

  const company = await db.company.findFirst({
    where: { id: companyId },
    select: {
      email: true,
    },
  });

  const { data: conversations } = await fetchMailsMailgun(+clientId);

  return (
    <div className="relative h-full">
      {/* className="relative mb-2 h-[87%] 2xl:h-[85%]" */}
      {company?.email ? (
        <MailgunMessageBox
          conversations={conversations}
          clientId={clientId}
          clientEmail={!!client?.email}
          clientPhoto={client?.photo}
        />
      ) : (
        <RedirectToSettings
          message="Business email is not setup for this company."
          link="/dashboard/settings/business"
        />
      )}
    </div>
  );
}
