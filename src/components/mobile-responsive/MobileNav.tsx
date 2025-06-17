"use client";
import { cn } from "@/lib/cn";
import { PermissionsResult } from "@/lib/getPermissions";
import { filterNavList } from "@/lib/navListAuthorization";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HiOutlineBars3, HiXCircle } from "react-icons/hi2";
import LogoutBtn from "../LogoutBtn";
import { NotificationsPopover } from "../NotificationProvider";
import ThemeSwitch from "../ThemeSwitch";
import MobileNavList from "./MobileNavList";
import AddLeads from "@/app/(dashboard)/dashboard/pipeline/components/AddLeads";
import { TbUsersPlus } from "react-icons/tb";
import { isIosPwa } from "@/utils/isIosPwa";
import { IoReload } from "react-icons/io5";

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
  const [openNav, setOpenNav] = useState(false);
  const filteredNavList = filterNavList(navList, permissions);
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
            <HiOutlineBars3 size={30} className="text-white" />
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
                <IoReload className="size-6 text-white lg:size-8" />
              </button>
            )}
            <AddLeads
              buttonChild={
                <button className="flex items-center gap-2 font-bold">
                  <TbUsersPlus color="white" className="size-6 lg:size-8" />
                </button>
              }
            />
            <NotificationsPopover className="text-white" />
            <div className="text-white">
              <ThemeSwitch />
            </div>
            <LogoutBtn className="text-[1.7rem] font-bold text-white" />
          </div>
        </div>
      </div>
      {/* nav sidebar */}
      <div
        className={cn(
          "w-0 bg-[#0C1427] duration-300",
          openNav && "fixed top-0 h-svh w-full overflow-scroll duration-300",
        )}
        style={{ zIndex: 999 }}
      >
        {openNav && (
          <div className="flex flex-col p-5">
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
                <HiXCircle size={30} />
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
