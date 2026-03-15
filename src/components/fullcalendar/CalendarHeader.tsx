"use client";

import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import FullCalendar from "@fullcalendar/react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { RefObject } from "react";
import Settings from "@/app/(dashboard)/dashboard/task/_component/calendar/Settings";
import { Appointment, Lead } from "@prisma/client";
import { appointmentQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";

const ALLOWED_ROLES_FOR_NEW_APPOINTMENT = ["Admin", "Manager", "Sales"];


interface CalendarHeaderProps {
  calendarRef: RefObject<FullCalendar | null>;
  title: string;
  view: string;
  date: Date;
}

export function CalendarHeader({
  calendarRef,
  title,
  view,
  date,
}: CalendarHeaderProps) {
  const session = useSession();
  const user = session?.data?.user;
  const queryClient = useQueryClient();

  const handleNext = () => {
    calendarRef.current?.getApi().next();
  };

  const handlePrev = () => {
    calendarRef.current?.getApi().prev();
  };

  const handleToday = () => {
    calendarRef.current?.getApi().today();
  };

  const handleViewChange = (newView: string) => {
    calendarRef.current?.getApi().changeView(newView);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (newDate) {
      calendarRef.current?.getApi().gotoDate(newDate);
    }
  };

  const handleAppointmentCreate = async (
    newAppointment: Appointment & { lead: Lead | null }
  ) => {
    try {
      const dateFormat = format(date, "yyyy-MM-dd");
      const formattedMonth = format(date, "MMMM");
      const formattedYear = format(date, "yyyy");

      // Invalidate queries for appointments based on the current month and year
      queryClient.invalidateQueries({
        queryKey: [
          appointmentQueryKey.allAppointments,
          formattedMonth,
          formattedYear,
        ],
      });
      // Invalidate queries for appointments based on the current DATE
      queryClient.invalidateQueries({
        queryKey: [appointmentQueryKey.allAppointments, dateFormat],
      });

      if (newAppointment?.lead?.columnId && newAppointment?.lead?.companyId) {
        await updatePipelineAutomationTrigger({
          condition: "APPOINTMENT_SCHEDULED",
          companyId: newAppointment?.lead?.companyId,
          leadId: newAppointment?.lead?.id,
          columnId: newAppointment?.lead?.columnId,
        });
      }
    } catch (error) {
      errorHandler(error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-background border-b gap-4">
      {/* Left: Title */}
      <h2 className="text-xl font-semibold text-foreground truncate">
        {title}
      </h2>

      {/* Right: Controls */}
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks and appointments..."
            className="pl-9 bg-background"
          />
        </div>

        {/* Date Picker (Simple) */}
        <div className="flex items-center border rounded-md px-2 py-1 bg-background h-9">
          <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
          <input
            type="date"
            className="bg-transparent border-none outline-none text-sm w-32"
            value={format(date, "yyyy-MM-dd")}
            onChange={handleDateChange}
          />
        </div>

        {/* Today Button */}
        <Button
          variant="outline"
          onClick={handleToday}
          className="bg-background"
        >
          Today
        </Button>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            className="bg-background h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="bg-background h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* View Select */}
        <Select value={view} onValueChange={handleViewChange}>
          <SelectTrigger className="w-[100px] bg-background">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="timeGridDay">Day</SelectItem>
            <SelectItem value="timeGridWeek">Week</SelectItem>
            <SelectItem value="dayGridMonth">Month</SelectItem>
            <SelectItem value="listWeek">List</SelectItem>
          </SelectContent>
        </Select>

        {/* New Appointment Button */}
        {ALLOWED_ROLES_FOR_NEW_APPOINTMENT.includes(user?.employeeType ?? "") && (
          <AppointmentCreateOrEdit
            onAppointmentCreated={handleAppointmentCreate}
          />
        )}

        {/* Settings Button */}
        <Settings />
      </div>
    </div>
  );
}
