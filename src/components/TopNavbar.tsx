import { useCanAccessRoute } from "@/hooks/useCanAccessRoute";
import TopNavbarIcons from "./TopNavbarIcons";
import ShopList from "./top-navbar/ShopList";

export default function TopNavbar() {
  const canAccessVirtualShop = useCanAccessRoute("/dashboard/virtual-shop");

  return (
    <div className="hidden h-[6vh] items-center justify-end p-5 pr-10 sm:flex">
      {canAccessVirtualShop && <ShopList />}
      <TopNavbarIcons />
    </div>
  );
}
