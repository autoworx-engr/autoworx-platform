import { getCompany } from "@/actions/settings/getCompany";
import BookingGenerate from "@/components/BookingGenerate";
import CallForwardingSettings from "@/components/CallForwardingSettings";
import GoogleReviewSettings from "@/components/GoogleReviewSettings";
import { TermsAndPolicyEditor } from "@/components/TermsAndPolicyEditor";
import { getCompanyId } from "@/lib/companyId";
import SecurityPage from "../security/SecurityPage";

export default async function CommunicationPage() {
  const companyId = await getCompanyId();
  const company = await getCompany();

  return (
    <div className="grid w-full grid-cols-1 md:grid-cols-2 items-start gap-4 px-5">
      {/* Security/Zapier Token  */}
      <div>
        <SecurityPage company={JSON.parse(JSON.stringify(company))} />
        <GoogleReviewSettings initialReviewLink={company?.googleReviewLink} />
        <BookingGenerate companyId={companyId.toString()} />
      </div>
      {/* Sidebar */}
<<<<<<< HEAD
      <div className="space-y-4 lg:mt-8">
        <CallForwardingSettings initialNumber={company?.callForwardingNumber} />
=======
      <div className="space-y-4">
>>>>>>> 562aae035edd611117b1950291edabf2b6d02c1d
        <div className="mt-4">
          <TermsAndPolicyEditor />
        </div>
      </div>
    </div>
  );
}
