import Link from "next/link";
import { getCompanyId } from "@/lib/companyId";
import { getCompanyEntitlements } from "@/lib/platform-billing/entitlement-service";

export default async function VisualizationPage() {
  const companyId = await getCompanyId();
  const entitlements = await getCompanyEntitlements(companyId);

  if (!entitlements.carWrapVisualizer) {
    return (
      <div className="flex min-h-[70vh] w-full items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Visualization is not available
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your current access does not include Car Wrap Visualization. Upgrade
            your plan to unlock this feature.
          </p>
          <Link
            href="/dashboard/settings/billing?showPlans=true"
            className="mt-5 inline-flex items-center rounded-lg bg-[#6571FF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5563E8]"
          >
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen">
      <iframe
        src="https://autoworxcarcustomizer.app/"
        title="AutoWorx Car Customizer Visualization"
        width="100%"
        height="100%"
        style={{ border: "none" }}
        allow="camera; microphone; geolocation; xr-spatial-tracking"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
