import React from "react";
import BusinessForm from "./BusinessForm";
import { getCompany } from "@/actions/settings/getCompany";

export default async function Container() {
  const company = await getCompany();

  return (
   <div className="rounded-xl p-6 shadow-xl bg-white border border-gray-100">
      <BusinessForm company={JSON.parse(JSON.stringify(company))} />
    </div>
  );
}
