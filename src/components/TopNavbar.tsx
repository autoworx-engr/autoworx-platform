import { useCanAccessRoute } from "@/hooks/useCanAccessRoute";
import TopNavbarIcons from "./TopNavbarIcons";
import ShopList from "./top-navbar/ShopList";

export default function TopNavbar() {
  // ShopList navigates into /dashboard/virtual-shop/admin/**, so it needs the
  // `virtualShop` module permission as well as the company feature — checking
  // only the feature left the switcher visible for roles that get a 404.
  const canAccessVirtualShop = useCanAccessRoute("/dashboard/virtual-shop");

  return (
    <div className="hidden h-[6vh] items-center justify-end p-5 pr-10 sm:flex">
      {canAccessVirtualShop && <ShopList />}
      <TopNavbarIcons />
    </div>
  );
}
