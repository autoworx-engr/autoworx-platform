import ShopForm from "../../component/ShopForm";
import { getCompanyId } from "@/lib/companyId";

export default async function UpdateShopPage({ params }: { params: any }) {
  const { id } = await params;
  const companyId = await getCompanyId();

  return (
    <div className="p-6">
      <ShopForm shopId={Number(id)} companyId={companyId} />
    </div>
  );
}
