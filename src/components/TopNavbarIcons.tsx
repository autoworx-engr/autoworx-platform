"use client";

import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { usePathname } from "next/navigation";
import BugReport from "./bug-report/BugReport";
import LogoutBtn from "./LogoutBtn";
// import { NotificationsPopover } from './NotificationProvider';
import QuickLink from "./QuickLink";
import dynamic from "next/dynamic";
// import ThemeSwitch from "./ThemeSwitch";

const NotificationsPopover = dynamic(
  () => import("./NotificationProvider").then(mod => mod.NotificationsPopover),
  { ssr: false }
);

export default function TopNavbarIcons() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const currentUser = useGetCurrentUser();

  return (
    <div className="flex items-center gap-x-3">
      {/* <SwitchDashboard /> */}
      {(currentUser?.employeeType == "Admin" ||
        currentUser?.employeeType == "Manager" ||
        currentUser?.employeeType == "Sales") &&
        isDashboard && <QuickLink />}
      {!isDashboard && <BugReport />}

      {/* <NewUserFeedback /> */}
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
