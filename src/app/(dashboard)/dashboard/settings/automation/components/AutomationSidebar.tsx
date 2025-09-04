"use client";
import { companyPermissionModule } from "@/constants/company-permission";
import { cn } from "@/lib/cn";
import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
import { PremiumModal } from "../../../communication/client/_component/phone/PremiumCallModal";
import { useState } from "react";
import { Skeleton } from "@mui/material";

const items = [
  {
    name: "pipeline",
    path: "pipeline",
    permissionName: companyPermissionModule.PIPELINE_AUTOMATION,
  },
  {
    name: "communication",
    path: "communication",
    permissionName: companyPermissionModule.COMMUNICATION_AUTOMATION,
  },
  {
    name: "marketing",
    path: "marketing",
    permissionName: companyPermissionModule.MARKETING_AUTOMATION,
  },
  {
    name: "service maintenance",
    path: "service-maintenance",
    permissionName: companyPermissionModule.SERVICE_AUTOMATION,
  },
  {
    name: "invoice",
    path: "invoice",
    permissionName: companyPermissionModule.INVOICE_AUTOMATION,
  },
  {
    name: "inventory",
    path: "inventory",
    permissionName: companyPermissionModule.INVENTORY_AUTOMATION,
  },
];

const AutomationSidebar = ({
  type,
  setType,
}: {
  type: string | null;
  setType: any;
}) => {
  const { companyFeaturePermission, isLoading } =
    useCompanyFeaturePermissionStore();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [pendingFeature, setPendingFeature] = useState<string | null>(null);

  const hasPermission = (permissionName: string) => {
    const permission = companyFeaturePermission.find(
      (p) => p.permission_name === permissionName
    );
    return permission?.enabled === true;
  };

  const handleClick = (item: (typeof items)[0], isDisabled: boolean) => () => {
    if (isDisabled) {
      setShowPremiumModal(true);
      setPendingFeature(item.name);
    } else {
      setType(item.path);
    }
  };

  if (isLoading) {
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
          const isDisabled = !hasPermission(item.permissionName);

          return (
            <div key={item.path} className="">
              <button
                onClick={handleClick(item, isDisabled)}
                // disabled={isLoading}
                className={cn(
                  "flex w-full flex-col items-center justify-center text-nowrap rounded-sm border border-gray-200 bg-white px-14 py-4 font-medium capitalize transition-colors",
                  isActive
                    ? "border-blue-500 text-blue-600"
                    : "hover:bg-gray-50"
                  // isLoading && "cursor-not-allowed opacity-50 ",
                )}
              >
                <span className={cn("text-sm", isActive ? "font-medium" : "")}>
                  {item.name}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <PremiumModal
        open={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        featureName={`${pendingFeature} automation`}
      />
    </div>
  );
};

export default AutomationSidebar;
