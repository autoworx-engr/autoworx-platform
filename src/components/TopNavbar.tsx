import TopNavbarIcons from "./TopNavbarIcons";
import ShopList from "./top-navbar/ShopList";

export default function TopNavbar() {
  return (
    <div className="hidden h-[6vh] items-center justify-end p-5 pr-10 sm:flex">
      <ShopList />
      <TopNavbarIcons />
    </div>
  );
}
