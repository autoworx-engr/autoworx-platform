"use client";
import { useCalendarSidebarStore } from "@/stores/calendarSidebar.ts";
import Users from "./Users";
import { Appointment, Task, User } from "@prisma/client";
import Tasks from "./Tasks";

export default function Body({
  usersWithTasks,
  tasks,
  companyUsers,
}: {
  usersWithTasks: any;
  tasks: Task[];
  companyUsers: User[];
}) {
  const { type } = useCalendarSidebarStore();

  if (type === "USERS") return <Users users={usersWithTasks} tasks={tasks} />;
  if (type === "TASKS")
    return (
      <Tasks tasks={tasks} users={usersWithTasks} companyUsers={companyUsers} />
    );
}
