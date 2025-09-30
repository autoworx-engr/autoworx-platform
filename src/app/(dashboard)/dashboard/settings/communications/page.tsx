import { getCompany } from "@/actions/settings/getCompany";
import BookingGenerate from "@/components/BookingGenerate";
import { TermsAndPolicyEditor } from "@/components/TermsAndPolicyEditor";
import { getCompanyId } from "@/lib/companyId";
import SecurityPage from "../security/SecurityPage";
import InfobipConfig from "./InfobipConfig";
import SmsGetwayForm from "./SmsGetwayForm";

export default async function CommunicationPage() {
  const companyId = await getCompanyId();
  const company = await getCompany();
  // const company = await db.company.findUnique({
  //   where: { id: companyId },
  // });
  return (
    <div className="grid w-full grid-cols-1 md:grid-cols-2 items-start gap-4 px-5">
      {/* Security/Zapier Token  */}
      <div>
        <SecurityPage company={JSON.parse(JSON.stringify(company))} />
        <BookingGenerate companyId={companyId.toString()} />

        <div className="mt-4">
          <TermsAndPolicyEditor />
        </div>
      </div>
      {/* Sidebar */}
      <div className="space-y-4">
        {/* SMS Gateway Settings */}
        <div className="space-y-6">
          <div className="space-y-3 rounded-sm border">
            {/* TODO: future added */}
            <SmsGetwayForm />
          </div>
          <div className="space-y-3 rounded-sm border">
            {/* TODO: future added */}
            <InfobipConfig />
          </div>
        </div>
      </div>
    </div>
  );
}
