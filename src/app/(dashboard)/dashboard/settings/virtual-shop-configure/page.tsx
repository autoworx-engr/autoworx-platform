import { getCompanyId } from "@/lib/companyId";
import React from "react";
import ShopListPage from "./component/ShopListPage";

async function VirtualShopConfigurePage() {
  const companyId = await getCompanyId();
  return <ShopListPage companyId={companyId} />;
}

export default VirtualShopConfigurePage;
