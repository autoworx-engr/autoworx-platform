import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
import TopNavbarIcons from "./TopNavbarIcons";
import ShopList from "./top-navbar/ShopList";

export default function TopNavbar() {
  const { companyFeaturePermission } = useCompanyFeaturePermissionStore();
  const virtualShopPermission = companyFeaturePermission.find(
    (p) => p.permission_name === "virtual-shop",
  );

  return (
    <div className="hidden h-[6vh] items-center justify-end p-5 pr-10 sm:flex">
      {/* {virtualShopPermission?.enabled && <ShopList />} */}
      <ShopList />
      <TopNavbarIcons />
    </div>
  );
}
