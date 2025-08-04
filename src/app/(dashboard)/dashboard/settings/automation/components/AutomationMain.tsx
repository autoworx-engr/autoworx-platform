"use client";
import { useState } from "react";
import AllCards from "./AllCards";
import AutomationSidebar from "./AutomationSidebar";
import { Company, TwilioCredentials, User } from "@prisma/client";


type AutomationMainProps = {
  companyId: any
  user: any
  company: Company | null
  twilio: TwilioCredentials | null
  employees?: User[] | null
}
const AutomationMain = ({ companyId, user, company, twilio, employees }: AutomationMainProps) => {
  const [type, setType] = useState<string | null>(null);

  const RenderPage = () => {
    if (!type) return null;
    return <AllCards type={type} companyId={companyId} user={user} company={company} twilio={twilio!} employees={employees}/>;
  };

  return (
    <>
      {/* Sidebar */}
      <aside className="w-full md:w-1/4">
        <h1 className="mb-6 text-xl font-semibold text-gray-800">Automation</h1>
        <AutomationSidebar setType={setType} type={type} />
      </aside>

      <main className="w-full md:w-3/4">{RenderPage()}</main>
    </>
  );
};

export default AutomationMain;
