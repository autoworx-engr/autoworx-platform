import { CalendarType } from "@/types/calendar";
import { AppointmentFull, CalendarAppointment, CalendarTask } from "@/types/db";
import type { EmailTemplate, Holiday } from "@prisma/client";
import { CalendarSettings, Client, Task, User, Vehicle } from "@prisma/client";
import { Suspense } from "react";
import Body from "./Body";
import Heading from "./Heading";
import Tasks from "../CalendarSidebar/Tasks";
import AppointmentDetails from "./AppointmentDetails";

export default function Calendar({
  type,
  tasks,
  companyUsers,
  tasksWithoutTime,
  customers,
  vehicles,
  settings,
  holidays,
  appointments,
  appointmentsFull,
  templates,
  user,
  usersWithTasks,
}: {
  type: CalendarType;
  tasks: CalendarTask[];
  companyUsers: User[];
  tasksWithoutTime: Task[];
  customers: Client[];
  vehicles: Vehicle[];
  holidays: Partial<Holiday>[];
  settings: CalendarSettings;
  appointments: CalendarAppointment[];
  appointmentsFull: AppointmentFull[];
  templates: EmailTemplate[];
  user: User;
  usersWithTasks: any;
}) {
  return (
    <div className="md:app-shadow relative h-auto w-full p-2 md:rounded-[18px] md:bg-background">
      <Heading
        type={type as any}
        customers={customers}
        vehicles={vehicles}
        settings={settings}
        employees={companyUsers}
        templates={templates}
        user={user}
        holidays={holidays}
        tasks={tasks}
        appointments={appointments}
      />
      <Suspense>
        <Body
          type={type as any}
          tasks={tasks}
          companyUsers={companyUsers}
          tasksWithoutTime={tasksWithoutTime}
          appointments={appointments}
          holidays={holidays}
          appointmentsFull={appointmentsFull}
          customers={customers}
          vehicles={vehicles}
          settings={settings}
          templates={templates}
        />
        <div className="block md:hidden">
          <AppointmentDetails appointments={appointments} />
        </div>
        <div className="block md:hidden">
          <Tasks
            tasks={tasks as any}
            users={usersWithTasks}
            companyUsers={companyUsers}
          />
        </div>
      </Suspense>
    </div>
  );
}
