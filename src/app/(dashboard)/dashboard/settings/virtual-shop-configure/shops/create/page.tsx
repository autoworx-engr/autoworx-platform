import React from "react";
import ShopForm from "../../component/ShopForm";
import { getCompanyId } from "@/lib/companyId";

export default async function CreateShopPage() {
  const companyId = await getCompanyId();
  return (
    <div className="p-6">
      <ShopForm companyId={companyId} />
    </div>
  );
}
