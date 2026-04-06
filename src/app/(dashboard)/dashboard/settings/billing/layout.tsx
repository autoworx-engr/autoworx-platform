import React from "react";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

type Props = {
  children: React.ReactNode;
};

export default async function BillingLayout({ children }: Props) {
  const companyId = await getCompanyId();

  if (companyId) {
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { enforcePlatformPlan: true },
    });

    const isLegacy = company ? !company.enforcePlatformPlan : false;
    if (isLegacy) {
      return (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">
            Billing Not Available
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            This company is in legacy plan mode, so platform billing settings
            are not accessible.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
