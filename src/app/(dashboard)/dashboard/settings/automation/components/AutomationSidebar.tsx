"use client";
import { companyPermissionModule } from "@/constants/company-permission";
import { cn } from "@/lib/cn";
import { Skeleton } from "@mui/material";
import { getEntitlements } from "@/actions/platform-billing/entitlements";
import { useServerGet } from "@/hooks/useServerGet";
import type { AutomationModuleKey } from "@/lib/platform-billing/entitlement-service";

const items = [
  {
    name: "pipeline",
    path: "pipeline",
    permissionName: companyPermissionModule.PIPELINE_AUTOMATION,
    moduleKey: "pipeline" as AutomationModuleKey,
  },
  {
    name: "communication",
    path: "communication",
    permissionName: companyPermissionModule.COMMUNICATION_AUTOMATION,
    moduleKey: "communication" as AutomationModuleKey,
  },
  {
    name: "marketing",
    path: "marketing",
    permissionName: companyPermissionModule.MARKETING_AUTOMATION,
    moduleKey: "marketing" as AutomationModuleKey,
  },
  {
    name: "service maintenance",
    path: "service-maintenance",
    permissionName: companyPermissionModule.SERVICE_AUTOMATION,
    moduleKey: "service" as AutomationModuleKey,
  },
  {
    name: "invoice",
    path: "invoice",
    permissionName: companyPermissionModule.INVOICE_AUTOMATION,
    moduleKey: "invoice" as AutomationModuleKey,
  },
  {
    name: "inventory",
    path: "inventory",
    permissionName: companyPermissionModule.INVENTORY_AUTOMATION,
    moduleKey: "inventory" as AutomationModuleKey,
  },
  {
    name: "tag",
    path: "tag",
    permissionName: companyPermissionModule.TAG_AUTOMATION,
    moduleKey: "tag" as AutomationModuleKey,
  },
  {
    name: "reporting",
    path: "reporting",
    permissionName: companyPermissionModule.REPORTING_AUTOMATION,
    moduleKey: "reporting" as AutomationModuleKey,
  },
];

const AutomationSidebar = ({
  type,
  setType,
  companyId,
}: {
  type: string | null;
  setType: any;
  companyId: number;
}) => {
  const { data: entitlementsRes, loading } = useServerGet(
    getEntitlements,
    companyId,
  );

  const automationModules = entitlementsRes?.success
    ? entitlementsRes.data?.automationModules || []
    : [];

  const handleClick = (item: (typeof items)[0]) => () => {
    // Always open the module page. If the module is not allowed,
    // AllCards shows the restriction message and upgrade CTA.
    setType(item.path);
  };

  if (loading) {
    return (
      <div className="mx-auto w-full lg:max-w-[700px]">
        <div className="space-y-4">
          {items.map((item) => (
            <Skeleton key={item.path} className="h-16 py-5 w-full rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full lg:max-w-[700px]">
      <div className="space-y-4">
        {items?.map((item) => {
          const isActive = type == item.path;
          const isDisabled = !automationModules.includes(item.moduleKey);

          return (
            <div key={item.path} className="">
              <button
                onClick={handleClick(item)}
                // onClick={handleClick(item)}
                // disabled={isLoading}
                className={cn(
                  "flex w-full flex-col items-center justify-center text-nowrap rounded-sm border border-gray-200 bg-white px-14 py-4 font-medium capitalize transition-colors",
                  isActive
                    ? "border-blue-500 text-blue-600"
                    : "hover:bg-gray-50",
                  isDisabled && !isActive && "border-dashed text-gray-500",
                  // isLoading && "cursor-not-allowed opacity-50 ",
                )}
              >
                <span className={cn("text-sm", isActive ? "font-medium" : "")}>
                  {item.name}
                </span>
                {isDisabled && (
                  <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-amber-600">
                    Restricted
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AutomationSidebar;
