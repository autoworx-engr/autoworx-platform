"use client";
import { cn } from "@/lib/cn";
import { PermissionsResult } from "@/lib/getPermissions";
import { filterNavList } from "@/lib/navListAuthorization";
import { FEATURE_PERMISSIONS_MAP } from "@/lib/routePermissionsMap";
import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
import { isIosPwa } from "@/utils/isIosPwa";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import BugReport from "../bug-report/BugReport";
import LogoutBtn from "../LogoutBtn";
import { NotificationsPopover } from "../NotificationProvider";
import QuickLink from "../QuickLink";

import MobileNavList from "./MobileNavList";
import { CircleX, Menu, RotateCw, SquarePlay } from "lucide-react";

type TProps = {
  navList: {
    title: string;
    icon: string;
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

  // Helper: Check if company feature permission allows access to this route
  function canAccessCompanyFeatureRoute(route: string): boolean {
    if (!companyFeaturePermission || companyFeaturePermission.length === 0)
      return true;
    const routeWithoutQuery = route.split("?")[0];
    const featureKey = FEATURE_PERMISSIONS_MAP[routeWithoutQuery];
    if (!featureKey) return true;
    if (Array.isArray(featureKey)) {
      return featureKey.some((key) =>
        companyFeaturePermission.some(
          (perm) => perm.permission_name === key && perm.enabled
        )
      );
    }
    return companyFeaturePermission.some(
      (perm) => perm.permission_name === featureKey && perm.enabled
    );
  }

  // First filter by permissions, then by company feature permission
  const [filteredNavList, setFilteredNavList] = useState(() => {
    // Permission-based filtering
    let permissionFiltered = filterNavList(navList, permissions);
    // Company feature permission filtering
    return permissionFiltered
      .filter((item) => !item.link || canAccessCompanyFeatureRoute(item.link))
      .map((item) => {
        if (item.subnav) {
          const filteredSubnav = item.subnav.filter((sub) =>
            canAccessCompanyFeatureRoute(sub.link)
          );
          return {
            ...item,
            subnav: filteredSubnav.length > 0 ? filteredSubnav : null,
          };
        }
        return item;
      });
  });

  useEffect(() => {
    // Permission-based filtering
    let permissionFiltered = filterNavList(navList, permissions);
    // Company feature permission filtering
    setFilteredNavList(
      permissionFiltered
        .filter((item) => !item.link || canAccessCompanyFeatureRoute(item.link))
        .map((item) => {
          if (item.subnav) {
            const filteredSubnav = item.subnav.filter((sub) =>
              canAccessCompanyFeatureRoute(sub.link)
            );
            return {
              ...item,
              subnav: filteredSubnav.length > 0 ? filteredSubnav : null,
            };
          }
          return item;
        })
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
      <div className="fixed top-0 z-50 w-full bg-white border-b border-slate-200">
        <div className="flex h-14 items-center justify-between bg-white p-1.5">
          <div
            onClick={() => setOpenNav((prev) => !prev)}
            className="w-20 flex-shrink-0"
          >
            <Menu size={30} className="text-slate-800" />
          </div>
          <div className="flex w-full items-center justify-center">
            <Link href="/">
              <Image
                src="/images/solution/logo1.png"
                alt="Company Logo"
                priority
                width={40}
                height={40}
              />
              <div className="py-0.1 absolute top-3 ml-6 rotate-12 transform gap-2 rounded-md border border-white bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-1 text-[8px] font-bold tracking-wider text-black shadow-lg">
                Beta
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-1 px-3">
            <button className="" onClick={() => window.location.reload()}>
              <RotateCw className="size-5 text-slate-800" />
            </button>
            <Link href="/dashboard/resources" className="px-3">
              <SquarePlay className="size-5 text-slate-800" />
            </Link>
            {(currentUser?.employeeType == "Admin" ||
              currentUser?.employeeType == "Manager" ||
              currentUser?.employeeType == "Sales") &&
              isDashboard && <QuickLink />}
            {!isDashboard && <BugReport />}

            <NotificationsPopover />
            <div className="text-slate-800">{/* <ThemeSwitch /> */}</div>
            <LogoutBtn className="text-[1.7rem] font-bold text-slate-800" />
          </div>
        </div>
      </div>
      {/* nav sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-[999] bg-white transform transition-transform duration-300 overflow-y-auto will-change-transform",
          openNav
            ? "translate-x-0 translate-y-0"
            : "-translate-x-full -translate-y-3"
        )}
        aria-hidden={!openNav}
      >
        <div className="flex h-full flex-col p-5">
          <div className="ml-4 flex items-center gap-3">
            <Image
              src="/images/solution/logo1.png"
              alt="company logo"
              priority
              width={50}
              height={50}
              className="mt-7"
            />
            <Image
              src="/images/solution/logo2.png"
              alt="company logo"
              priority
              width={220}
              height={50}
              className="mt-7"
            />
            <button
              onClick={() => setOpenNav(false)}
              className="absolute right-5 top-5 text-2xl text-slate-700 hover:text-gray-400"
            >
              <CircleX strokeWidth={2} size={24} />
            </button>
          </div>
          <ul className="mt-10 pb-4 ml-4 flex flex-col items-start justify-center gap-y-4">
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
      </div>
    </div>
  );
}
