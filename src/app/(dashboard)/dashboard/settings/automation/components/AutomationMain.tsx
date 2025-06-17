"use client";
import { useState } from "react";
import AllCards from "./AllCards";
import AutomationSidebar from "./AutomationSidebar";

const AutomationMain = ({ companyId, user }: any) => {
  const [type, setType] = useState<string | null>(null);

  const RenderPage = () => {
    if (!type) return null;
    return <AllCards type={type} companyId={companyId} user={user} />;
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
