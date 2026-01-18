"use client";
import { getCalenderSettings } from "@/actions/task/getCalendarSettings";
import { DropdownSelection } from "@/components/DropDownSelection";
import { CalendarType } from "@/types/calendar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { appointmentQueryKey, calenderQueryKey } from "../../_constant";
import DisplayDate from "./DisplayDate";
import Settings from "./Settings";
import CalendarSearch from "./CalendarSearch";
import moment from "moment";
import { useCalendarStore } from "@/stores/calendarStore";
import ArrowButton from "./ArrowButton";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import { useSession } from "next-auth/react";
import DateSelector from "./DateSelector";
import { useDate } from "../../_hook/lib/useDate";
import useMonth from "../../_hook/lib/useMonth";
import useWeekStartEndDays from "../../_hook/lib/useWeekStartEndDays";
import { Appointment, Lead, Technician, User } from "@prisma/client";
import { updatePipelineAutomationTrigger } from "@/actions/automation/pipeline/triggerPipelineAutomation";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import Selector from "@/components/Selector";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { useEffect, useState } from "react";
import { getEmployees } from "@/actions/employee/get";

type THeadingProps = {
  type: CalendarType;
  technicianList?: Technician[];
};

const days = ["SUN", "MON", "TUE", "WED", "THUS", "FRI", "SAT"];

const BUTTON_STYLE = `
  // Base look: Clean background, premium ring border, rounded-md corners
  bg-white/50 backdrop-blur-sm 
  rounded-md ring-1 ring-slate-900/5 dark:bg-slate-900/50 dark:ring-slate-700/50
  p-2 border
  // Text & Color: Professional slate tones
  text-slate-600 dark:text-slate-300 font-medium text-sm
  // Interaction: Smooth transition and subtle hover
  transition-all duration-300 ease-in-out
  hover:bg-white/80 dark:hover:bg-slate-800/80
  hover:-translate-y-0.5 hover:shadow-md
  focus:outline-none focus:ring-2 focus:ring-[#6571FF]
`;
const DROPDOWN_STYLE = `
  // Inherits utility button style for consistency, plus specific padding
  ${BUTTON_STYLE}
  px-4 py-2 capitalize
`;

const ALLOWED_ROLES_FOR_NEW_APPOINTMENT = ["Admin", "Manager", "Sales"];

export default function Heading({ type, technicianList }: THeadingProps) {
  const [employeeList, setEmployeeList] = useState<User[]>([]);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [employee, setEmployee] = useState<User | null>(null);

  const searchParams = useSearchParams();
  const pathname = usePathname();

  const date = useDate();
  const dateFormat = date.format("YYYY-MM-DD");
  const month = useMonth();
  const formattedMonth = month
    ? moment(month, "YYYY-MM").format("MMMM")
    : moment().format("MMMM");

  const formattedYear = month
    ? moment(month, "YYYY-MM").year()
    : moment().year();

  const { weekStartDate, weekEndDate } = useWeekStartEndDays();
  const queryClient = useQueryClient();
  const session = useSession();
  const user = session?.data?.user;
  const { data: settings } = useQuery({
    queryKey: [calenderQueryKey.calendarSettings],
    queryFn: () => {
      return getCalenderSettings();
    },
  });
  const router = useRouter();
  const calenderQueryType = type === "day" ? "date" : type;

  useEffect(() => {
    const fetchEmployees = async () => {
      const employees = await getEmployees({ notType: "Sales" });
      setEmployeeList(employees);
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!employee?.id) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("employee", employee?.id.toString());

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [employee?.id]);

  const handleClearEmployee = () => {
    setEmployee(null);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("employee");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const { setDate, setNavigating, date: currentDate } = useCalendarStore();

  const currentDayIndex = moment(currentDate).day();

  const availableEmployees = employeeList.filter(
    (emp) => !technicianList?.some((tech) => tech.userId === emp.id),
  );

  const currentUser = useGetCurrentUser();
  const isTechnician = currentUser?.employeeType === "Technician";

  const handleTodayClick = () => {
    const today = moment().format("YYYY-MM-DD");
    setDate(today);

    if (type !== "day") {
      // Set navigation flag to prevent reset, then navigate
      setNavigating(true);
      router.push("day");

      // Clear navigation flag after a short delay to allow navigation to complete
      // setTimeout(() => setNavigating(false), 30000);
    }
  };

  const handleAppointmentCreate = async (
    newAppointment: Appointment & { lead: Lead | null },
  ) => {
    try {
      // Invalidate queries for appointments based on the current month and year
      queryClient.invalidateQueries({
        queryKey: [
          appointmentQueryKey.allAppointments,
          formattedMonth,
          formattedYear,
        ],
      });
      // Invalidate queries for appointments based on the current week
      queryClient.invalidateQueries({
        queryKey: [
          appointmentQueryKey.allAppointments,
          weekStartDate,
          weekEndDate,
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
      // console.error("Error creating appointment:", error);
      errorHandler(error);
    }
  };
  return (
    <div className="flex flex-col items-center justify-between md:flex-row">
      <h2 className="mb-4 font-bold text-[#797979] max-[1300px]:text-[20px] md:ml-2 md:text-base lg:text-[26px]">
        <DisplayDate type={type} />
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-1 text-left lg:justify-end xl:gap-3">
        {/* Desktop Search */}
        <div className="mb-2 hidden w-full md:mb-0 lg:block lg:w-64 xl:w-80">
          <CalendarSearch type={type} />
        </div>
        <div
          className={
            isTechnician ? "pointer-events-none opacity-50 w-full" : ""
          }
        >
          <Selector
            label={(employee) =>
              employee?.firstName ? `${employee.firstName}` : "Employee"
            }
            newButton={<div></div>}
            items={availableEmployees}
            displayList={(employee: User) => (
              <p>
                {employee.firstName} {employee.lastName}
              </p>
            )}
            onSearch={(search: string) =>
              availableEmployees.filter((employee) =>
                `${employee.firstName} ${employee.lastName}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
            }
            openState={[employeeOpen, setEmployeeOpen]}
            selectedItem={employee}
            //@ts-ignore
            setSelectedItem={setEmployee}
            footer={
              employee && (
                <button
                  type="button"
                  onClick={handleClearEmployee}
                  className="w-full text-sm text-red-600 hover:text-red-700"
                >
                  Clear employee
                </button>
              )
            }
          />
        </div>
        {/* Custom Date Selector - replaces GoToDate */}
        <DateSelector type={type} weekStart={settings?.weekStart} />

        {/* today */}
        <button
          className={`${BUTTON_STYLE} hidden lg:block`}
          onClick={handleTodayClick}
        >
          Today
        </button>

        {/* Arrow next or previous day/week/month */}
        <ArrowButton
          direction="back"
          type={type}
          calenderQueryType={calenderQueryType}
        />
        <ArrowButton
          direction="forward"
          type={type}
          calenderQueryType={calenderQueryType}
        />

        {/* dropdown selection day, week and month */}
        <div>
          {" "}
          <DropdownSelection
            dropDownValues={["day", "week", "month"]}
            onValueChange={(value) => {
              // Set navigation flag to prevent reset, then navigate
              // setNavigating(true);
              router.push(value.toLowerCase());

              // Clear navigation flag after a short delay to allow navigation to complete
              // setTimeout(() => setNavigating(false), 30000);
            }}
            changesValue={type}
            buttonClassName={DROPDOWN_STYLE}
            contentClassName="capitalize"
          />
        </div>

        {/* new appointment */}
        {ALLOWED_ROLES_FOR_NEW_APPOINTMENT.includes(
          user?.employeeType ?? "",
        ) && (
          <AppointmentCreateOrEdit
            onAppointmentCreated={handleAppointmentCreate}
          />
        )}

        <Settings />

        {/* Mobile Search */}

        <div className="my-2 block w-full md:mb-0 lg:hidden">
          <div className="flex items-center justify-around gap-2">
            {days.map((day, index) => (
              <p
                key={day}
                className={` p-1 rounded-full ${
                  index === currentDayIndex
                    ? "bg-blue-500 text-white font-bold"
                    : ""
                }`}
              >
                {day}
              </p>
            ))}
          </div>
          <CalendarSearch type={type} />
        </div>
      </div>
    </div>
  );
}
