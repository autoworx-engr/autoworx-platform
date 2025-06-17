"use client";

import { cn } from "@/lib/cn";
import { useCalendarSidebarStore } from "@/stores/calendarSidebar";
import type { Appointment, Task, User } from "@prisma/client";
import Body from "./Body";
import Heading from "./Heading";

export default function CalendarSidebar({
  usersWithTasks,
  tasks,
  companyUsers,
  user,
}: {
  usersWithTasks: any;
  tasks: Task[];
  companyUsers: User[];
  user: User;
}) {
  const minimized = useCalendarSidebarStore((x) => x.minimized);

  return (
    <div
      className={cn(
        "hidden flex-col overflow-x-clip transition-[width] ease-in md:flex",
        minimized ? "w-8" : "w-[20%] max-[1300px]:w-[300px] 2xl:w-[370px]",
      )}
    >
      <Heading user={user} />
      <Body
        usersWithTasks={usersWithTasks}
        tasks={tasks}
        companyUsers={companyUsers}
      />
    </div>
  );
}
