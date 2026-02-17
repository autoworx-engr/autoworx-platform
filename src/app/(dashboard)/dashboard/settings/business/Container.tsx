import React from "react";
import BusinessForm from "./BusinessForm";
import { getCompany } from "@/actions/settings/getCompany";

export default async function Container() {
  const company = await getCompany();

  return (
    <div className="bg-white px-2">
      <BusinessForm company={JSON.parse(JSON.stringify(company))} />
    </div>
  );
}
