import CannedLeadForm from "@/components/CannedLeadForm";
import SourceForm from "@/components/sourceForm";
import { getCompanyId } from "@/lib/companyId";
import React from "react";

export default async function page() {
  const companyId = await getCompanyId();

  return (
    <div className="flex flex-col justify-center gap-5 xl:flex-row xl:justify-between">
      <SourceForm companyId={companyId} />
      <CannedLeadForm companyId={companyId} />
    </div>
  );
}
