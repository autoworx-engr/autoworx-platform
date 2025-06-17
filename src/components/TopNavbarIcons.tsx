"use client";

import AddLeads from "@/app/(dashboard)/dashboard/pipeline/components/AddLeads";
import LogoutBtn from "./LogoutBtn";
import { NotificationsPopover } from "./NotificationProvider";
import { TbUsersPlus } from "react-icons/tb";

// import ThemeSwitch from "./ThemeSwitch";

export default function TopNavbarIcons() {
  return (
    <div className="flex items-center gap-x-5">
      <AddLeads
        buttonChild={
          <button className="flex items-center gap-2 font-bold">
            <TbUsersPlus size={28} color="#6571FF" /> {/* Icon */}
          </button>
        }
      />
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
