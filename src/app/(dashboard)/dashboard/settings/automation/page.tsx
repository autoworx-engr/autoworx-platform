import React from "react";

import AutomationMain from "./components/AutomationMain";
import { getCompanyId } from "@/lib/companyId";
import getUser from "@/lib/getUser";

export default async function AutomationPage() {
  const companyId = await getCompanyId();
  const user = await getUser();
  return (
    <div className="min-h-screen w-full bg-gray-50 px-4 py-6">
      <div className="flex flex-col items-start gap-6 md:flex-row">
        <AutomationMain companyId={companyId} user={user} />
      </div>
    </div>
  );
}
