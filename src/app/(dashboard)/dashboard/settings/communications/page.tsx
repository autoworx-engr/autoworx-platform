import { getCompany } from "@/actions/settings/getCompany";
import BookingGenerate from "@/components/BookingGenerate";
import { TermsAndPolicyEditor } from "@/components/TermsAndPolicyEditor";
import { getCompanyId } from "@/lib/companyId";
import SecurityPage from "../security/SecurityPage";
import InfobipConfig from "./InfobipConfig";
import SmsGetwayForm from "./SmsGetwayForm";
import SmsGatewayButton from "./SmsGatewayButton";

export default async function CommunicationPage() {
  const companyId = await getCompanyId();
  const company = await getCompany();

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
        <SmsGatewayButton smsGateway={company?.smsGateway} />
      </div>
    </div>
  );
}
