import React from "react";

import AutomationMain from "./components/AutomationMain";
import { getCompanyId } from "@/lib/companyId";
import getUser from "@/lib/getUser";
import { getVehicles } from "@/actions/vehicle/getVehicles";
import { getCompany } from "@/actions/settings/getCompany";
import { getTwilioCredentials } from "@/actions/communication/client/createTwilioCredentials";
import { getCompanyUser } from "@/actions/user/getCompanyUser";

export default async function AutomationPage() {
  const companyId = await getCompanyId();
  const user = await getUser();
  const company = await getCompany();
  const { data:twilio} = await getTwilioCredentials()

  const companyUsers = await getCompanyUser({
     select: { id: true, firstName: true, lastName: true, role:true },
   });
  

   
  return (
    <div className="min-h-screen w-full bg-gray-50 px-4 py-6">
      <div className="flex flex-col items-start gap-6 md:flex-row">
        <AutomationMain companyId={companyId} user={user} company={company} twilio={twilio!} employees={companyUsers}/>
      </div>
    </div>
  );
}
