"use client";

import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { usePathname } from "next/navigation";
import BugReport from "./bug-report/BugReport";
import LogoutBtn from "./LogoutBtn";
// import { NotificationsPopover } from './NotificationProvider';
import QuickLink from "./QuickLink";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Layers, RotateCw, SquarePlay } from "lucide-react";

const NotificationsPopover = dynamic(
  () =>
    import("./NotificationProvider").then((mod) => mod.NotificationsPopover),
  { ssr: false }
);

export default function TopNavbarIcons() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const currentUser = useGetCurrentUser();

  return (
    <div className="flex items-center gap-x-3">
      <button className="lg:hidden" onClick={() => window.location.reload()}>
        <RotateCw className="size-7 text-[#6571FF]" />
      </button>
      <Link href="/dashboard/resources" className="px-2">
        <Layers className="size-5 sm:size-7  text-[#6571FF]" />
      </Link>
      {/* <SwitchDashboard /> */}
      {(currentUser?.employeeType == "Admin" ||
        currentUser?.employeeType == "Manager" ||
        currentUser?.employeeType == "Sales") &&
        isDashboard && <QuickLink />}
      {!isDashboard && <BugReport />}

      {/* <button className="bg-background text-[1.7rem] font-bold text-[#6571FF]">
        <MdOutlineNotifications />
      </button> */}
      <NotificationsPopover />

      {/* <ThemeSwitch /> */}
      {/* will need in future  */}
      {/* <button className="bg-background text-[1.7rem] font-bold text-[#6571FF]">
        <HiOutlineChatBubbleLeftRight />
      </button>
      <button className="bg-background text-[1.7rem] font-bold text-[#6571FF]">
        <LuUser />
      </button> */}

      <LogoutBtn />
    </div>
  );
}
