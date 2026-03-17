import { getCompanyId } from "@/lib/companyId";
import React from "react";
import VirtualShopConfigure from "./VirtualShopConfigure";

async function VirtualShopConfigurePage() {
  const companyId = await getCompanyId();
  return <VirtualShopConfigure companyId={companyId} />;
}

export default VirtualShopConfigurePage;
