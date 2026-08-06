"use client";
import { cn } from "@/lib/cn";
import { PermissionsResult } from "@/lib/getPermissions";
import { useCanAccessRoute } from "@/hooks/useCanAccessRoute";
import { filterNavList } from "@/lib/navListAuthorization";
import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
import { isIosPwa } from "@/utils/isIosPwa";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import BugReport from "../bug-report/BugReport";
import GlobalSearch from "../GlobalSearch";
import LogoutBtn from "../LogoutBtn";
import { NotificationsPopover } from "../NotificationProvider";
import QuickLink from "../QuickLink";
import ShopList from "../top-navbar/ShopList";

import MobileNavList from "./MobileNavList";
import { CircleX, Menu, RotateCw, SquarePlay } from "lucide-react";

type TProps = {
  navList: {
    title: string;
    icon: string | React.ReactNode;
    link?: string | null;
    path: string;
    subnav?:
      | {
          title: string;
          link: string;
        }[]
      | null;
  }[];
  permissions: PermissionsResult | null;
};

export default function MobileNav({ navList, permissions }: TProps) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const [openNav, setOpenNav] = useState(false);
  const currentUser = useGetCurrentUser();
  const { companyFeaturePermission } = useCompanyFeaturePermissionStore();

  // Matches TopNavbar: the shop switcher links into /dashboard/virtual-shop.
  const canAccessVirtualShop = useCanAccessRoute("/dashboard/virtual-shop");

  // Route → key resolution (including subtree prefixes and the entitlement
  // carve-outs) lives in filterNavList so nav and route guards can't drift.
  const [filteredNavList, setFilteredNavList] = useState(() =>
    filterNavList(navList, permissions, companyFeaturePermission),
  );

  useEffect(() => {
    setFilteredNavList(
      filterNavList(navList, permissions, companyFeaturePermission),
    );
  }, [companyFeaturePermission, navList, permissions]);
  useEffect(() => {
    if (openNav) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [openNav]);

  const isIOS = isIosPwa();

  // const isAndroidPwa =
  //   /Android/i.test(navigator.userAgent) &&
  //   window.matchMedia("(display-mode: standalone)").matches;
  // const showReloadButton = isIOS || isAndroidPwa;

  return (
    <div className="z-50 sm:hidden">
      <div className="fixed top-0 z-50 w-full bg-[#0C1427]">
        <div className="flex h-14 items-center justify-between bg-[#0C1427] p-1.5">
          <div
            onClick={() => setOpenNav((prev) => !prev)}
            className="w-20 flex-shrink-0"
          >
            <Menu size={30} className="text-white" />
          </div>
          <div className="flex w-full items-center justify-center">
            <Link href="/">
              <Image
                src="/icons/Logo.png"
                alt="Company Logo"
                priority
                width={40}
                height={40}
              />
            </Link>
          </div>
          <div className="flex items-center gap-1 px-3">
            {canAccessVirtualShop && (
              <ShopList iconOnly className="mr-0 w-auto" />
            )}
            <button className="" onClick={() => window.location.reload()}>
              <RotateCw className="size-5 text-white" />
            </button>
            <Link href="/dashboard/resources" className="px-3">
              <SquarePlay className="size-5 text-white" />
            </Link>
            {(currentUser?.employeeType == "Admin" ||
              currentUser?.employeeType == "Manager" ||
              currentUser?.employeeType == "Sales") &&
              isDashboard && <QuickLink />}
            {!isDashboard && <BugReport />}

            <GlobalSearch iconClassName="size-5 text-white" />
            <NotificationsPopover />
            <div className="text-white">{/* <ThemeSwitch /> */}</div>
            <LogoutBtn className="text-[1.7rem] font-bold text-white" />
          </div>
        </div>
      </div>
      {/* nav sidebar */}
      <div
        className={cn(
          "w-0 bg-[#0C1427] duration-300",
          openNav && "fixed inset-0 w-full overflow-scroll duration-300",
        )}
        style={{
          zIndex: 999,
        }}
      >
        {openNav && (
          <div className="flex h-full flex-col overflow-y-auto p-5">
            <div className="flex justify-center">
              <Image
                src="/icons/navbar/mobile-nav-logo.svg"
                alt="company logo"
                priority
                width={275}
                height={50}
                className="mt-7"
              />
              <button
                onClick={() => setOpenNav(false)}
                className="absolute right-5 top-5 text-2xl text-white hover:text-gray-400"
              >
                <CircleX strokeWidth={2} size={24} />
              </button>
            </div>
            <ul className="mt-10 flex w-full flex-col items-start justify-center gap-y-8 px-4">
              {filteredNavList.map((item, index) => {
                return (
                  <MobileNavList
                    key={index}
                    item={item}
                    setOpenNav={setOpenNav}
                  />
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
