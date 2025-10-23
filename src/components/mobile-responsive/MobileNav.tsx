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
import { CircleX, Menu, RotateCw } from "lucide-react";

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
              <div className="py-0.1 absolute top-3 ml-6 rotate-12 transform gap-2 rounded-md border border-white bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-1 text-[8px] font-bold tracking-wider text-black shadow-lg">
                Beta
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-1 px-3">
            {isIOS && (
              <button className="mr-3" onClick={() => window.location.reload()}>
                <RotateCw className="size-6 text-white lg:size-8" />
              </button>
            )}
            {(currentUser?.employeeType == "Admin" ||
              currentUser?.employeeType == "Manager" ||
              currentUser?.employeeType == "Sales") &&
              isDashboard && <QuickLink />}
            {!isDashboard && <BugReport />}

            <NotificationsPopover className="text-white" />
            <div className="text-white">{/* <ThemeSwitch /> */}</div>
            <LogoutBtn className="text-[1.7rem] font-bold text-white" />
          </div>
        </div>
      </div>
      {/* nav sidebar */}
      <div
        className={cn(
          "w-0 bg-[#0C1427] duration-300",
          openNav && "fixed inset-0 w-full overflow-scroll duration-300"
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
            <ul className="mt-10 flex flex-col items-center justify-center gap-y-8">
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
