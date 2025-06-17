"use client";
import { usePermissionStore } from "@/stores/permissionStore";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import ReportLink from "../components/ReportLink";
type TProps = {
  children: React.ReactNode;
};

export default function ReportLayout({ children }: TProps) {
  const { permissions } = usePermissionStore();
  const router = useRouter();

  useEffect(() => {
    if (permissions?.role === "Sales") {
      router.push("/dashboard/reporting/salesreporting");
    } else if (permissions?.role === "Technician") {
      router.push("/dashboard/reporting/technicianreporting");
    }
  }, [permissions, router]);
  return (
    <div>
      {permissions?.role === "Admin" || permissions?.role === "Manager" ? (
        <div>
          <div className="flex flex-col p-5 lg:flex-row lg:items-center">
            <h1 className="mb-4 text-center text-2xl font-bold lg:mb-0 lg:mr-4 lg:text-left">
              Reporting
            </h1>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-x-4">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 lg:flex lg:gap-4">
                <ReportLink href="/dashboard/reporting/revenue">
                  Revenue
                </ReportLink>
                <ReportLink href="/dashboard/reporting/inventory">
                  Inventory
                </ReportLink>
                <ReportLink href="/dashboard/reporting/leads">Leads</ReportLink>
              </div>
              <div className="flex justify-center gap-2 lg:flex lg:gap-4">
                <ReportLink href="/dashboard/reporting/payments">
                  Payments
                </ReportLink>
                {
                  //@ts-ignore
                  permissions?.companyPermissions?.workforceManagement !==
                    false && (
                    <ReportLink href="/dashboard/reporting/workforce">
                      Workforce
                    </ReportLink>
                  )
                }
              </div>
            </div>
          </div>
          <div className="bg-background p-5 md:rounded-lg md:shadow-md">
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
