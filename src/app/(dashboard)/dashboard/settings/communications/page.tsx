import { getCompany } from "@/actions/settings/getCompany";
import BookingGenerate from "@/components/BookingGenerate";
import CallForwardingSettings from "@/components/CallForwardingSettings";
import CallWhisperSettings from "@/components/CallWhisperSettings";
import GoogleReviewSettings from "@/components/GoogleReviewSettings";
import MissedCallTextBackSettings from "@/components/MissedCallTextBackSettings";
import { TermsAndPolicyEditor } from "@/components/TermsAndPolicyEditor";
import { getCompanyId } from "@/lib/companyId";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import { allCompanyFeaturePermissions } from "@/service/feature-permissions/api";
import { companyPermissionModule } from "@/constants/company-permission";
import SecurityPage from "../security/SecurityPage";
import FacebookPagesSettings from "./FacebookPagesSettings";
import InstagramSettings from "./InstagramSettings";
import { refreshSettingsPhotos } from "@/actions/meta/refreshSettingsPhotos";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Communications",
  description: "Configure communications settings",
};

type TProps = {
  searchParams: Promise<{
    meta_success?: string;
    meta_error?: string;
    ig_success?: string;
    ig_error?: string;
  }>;
};

export default async function CommunicationPage({ searchParams }: TProps) {
  const companyId = await getCompanyId();

  // Refresh FB page + IG account profile pictures in the background
  refreshSettingsPhotos().catch(() => {});

  const company = await getCompany();
  const entitlements = await getCompanyEntitlements(companyId);
  const { meta_success, meta_error, ig_success, ig_error } = await searchParams;

  const permissionsRes = await allCompanyFeaturePermissions(companyId);
  const permissions: { permission_name: string; enabled: boolean }[] =
    permissionsRes?.data ?? [];
  const isMessengerEnabled = permissions.find(
    (p) => p.permission_name === companyPermissionModule.MESSENGER,
  )?.enabled;

  const isInstagramEnabled = permissions.find(
    (p) => p.permission_name === companyPermissionModule.INSTAGRAM,
  )?.enabled;

  return (
    <div className="grid w-full grid-cols-1 md:grid-cols-2 items-start gap-6 xl:gap-8">
      {/* Security/Zapier Token  */}
      <div className="space-y-4">
        <SecurityPage company={JSON.parse(JSON.stringify(company))} />
        <GoogleReviewSettings initialReviewLink={company?.googleReviewLink} />
        <BookingGenerate companyId={companyId.toString()} />
        {/* Facebook Messenger integration */}
        {isMessengerEnabled && (
          <FacebookPagesSettings
            successParam={meta_success}
            errorParam={meta_error}
          />
        )}
        {/* Instagram DM integration */}
        {isInstagramEnabled && (
          <InstagramSettings successParam={ig_success} errorParam={ig_error} />
        )}
      </div>
      {/* Sidebar */}
      <div className="space-y-4 lg:mt-8">
        <CallForwardingSettings initialNumber={company?.callForwardingNumber} />
        <MissedCallTextBackSettings
          initialEnabled={company?.missedCallTextBackEnabled}
          isAllowed={entitlements.canUseSms && entitlements.missedCallTextBack}
        />
        <CallWhisperSettings
          initialEnabled={company?.callWhisperEnabled ?? true}
        />
        <div className="mt-4">
          <TermsAndPolicyEditor />
        </div>
      </div>
    </div>
  );
}
