import { isSmsAvailable } from "@/actions/communication/client/createTwilioCredentials";
import { getCompany } from "@/actions/settings/getCompany";
import { getCompanyUser } from "@/actions/user/getCompanyUser";
import { getCompanyId } from "@/lib/companyId";
import getUser from "@/lib/getUser";
import AutomationMain from "./components/AutomationMain";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Automation",
  description: "Configure automation settings",
};

export default async function AutomationPage() {
  const companyId = await getCompanyId();
  const user = await getUser();
  const company = await getCompany();
  const { data: twilio } = await isSmsAvailable();

  const companyUsers = await getCompanyUser({
    select: { id: true, firstName: true, lastName: true, role: true },
  });

  return (
    <div className="min-h-screen w-full bg-gray-50 px-4 py-6">
      <div className="flex flex-col items-start gap-6 md:flex-row">
        <AutomationMain
          companyId={companyId}
          user={user}
          company={company}
          twilio={twilio!}
          employees={companyUsers}
        />
      </div>
    </div>
  );
}
