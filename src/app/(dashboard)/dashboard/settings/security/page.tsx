import { getCompany } from "@/actions/settings/getCompany";
import React from "react";
import SecurityPage from "./SecurityPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Security",
  description: "Configure security settings",
};

type Props = {};

const page = async (props: Props) => {
  const company = await getCompany();

  return <SecurityPage company={JSON.parse(JSON.stringify(company))} />;
};

export default page;
