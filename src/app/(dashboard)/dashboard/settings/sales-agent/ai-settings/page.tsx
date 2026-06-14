import React from "react";
import AISettings from "../components/AISettings";
import UpgradePlanBanner from "@/components/UpgradePlanBanner";
import { getCompanyId } from "@/lib/companyId";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Sales Agent AI",
  description: "Configure AI settings for your sales agent",
};

export default async function AISettingsPage() {
  const companyId = await getCompanyId();
  const entitlements = await getCompanyEntitlements(companyId);

  if (!entitlements.awxSalesAgent) {
    return (
      <div className="mx-auto w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">
          AI Settings are not available
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Your current plan does not include AI Sales Agent AI settings.
        </p>
        <UpgradePlanBanner
          title="Upgrade to configure AI Sales Agent"
          description="Enable advanced AI settings and automation by upgrading your plan."
          ctaLabel="Upgrade Plan"
        />
      </div>
    );
  }

  return <AISettings />;
}
