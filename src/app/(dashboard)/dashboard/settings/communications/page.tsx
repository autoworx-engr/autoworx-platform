import { getCompany } from "@/actions/settings/getCompany";
import BookingGenerate from "@/components/BookingGenerate";
import CallForwardingSettings from "@/components/CallForwardingSettings";
import CallWhisperSettings from "@/components/CallWhisperSettings";
import GoogleReviewSettings from "@/components/GoogleReviewSettings";
import MissedCallTextBackSettings from "@/components/MissedCallTextBackSettings";
import { TermsAndPolicyEditor } from "@/components/TermsAndPolicyEditor";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import SecurityPage from "../security/SecurityPage";
import MetaIntegrationCard from "./MetaIntegrationCard";
import MetaConnectedToast from "./MetaConnectedToast";

export default async function CommunicationPage() {
  const companyId = await getCompanyId();
  const company = await getCompany();
  const entitlements = await getCompanyEntitlements(companyId);

  const metaCredential = await db.metaCredentials.findFirst({
    where: { companyId, isActive: true },
    select: {
      id: true,
      pageId: true,
      pageName: true,
      instagramAccountId: true,
      instagramUsername: true,
    },
  });

  return (
    <>
      <MetaConnectedToast />
      <div className="grid w-full grid-cols-1 md:grid-cols-2 items-start gap-6 xl:gap-8">
        {/* Security/Zapier Token  */}
        <div>
          <SecurityPage company={JSON.parse(JSON.stringify(company))} />
          <GoogleReviewSettings initialReviewLink={company?.googleReviewLink} />
          <BookingGenerate companyId={companyId.toString()} />
        </div>
        {/* Sidebar */}
        <div className="space-y-4 lg:mt-8">
          <MetaIntegrationCard credential={metaCredential} />
          <CallForwardingSettings
            initialNumber={company?.callForwardingNumber}
          />
          <MissedCallTextBackSettings
            initialEnabled={company?.missedCallTextBackEnabled}
            isAllowed={
              entitlements.canUseSms && entitlements.missedCallTextBack
            }
          />
          <CallWhisperSettings
            initialEnabled={company?.callWhisperEnabled ?? true}
          />
          <div className="mt-4">
            <TermsAndPolicyEditor />
          </div>
        </div>
      </div>
    </>
  );
}
