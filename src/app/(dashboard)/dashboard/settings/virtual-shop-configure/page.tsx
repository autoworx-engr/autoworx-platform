import { getCompanyId } from "@/lib/companyId";
import React from "react";
import ShopListPage from "./component/ShopListPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Virtual Shop Configure",
  description: "Configure virtual shop settings",
};

async function VirtualShopConfigurePage() {
  const companyId = await getCompanyId();
  return <ShopListPage companyId={companyId} />;
}

export default VirtualShopConfigurePage;
