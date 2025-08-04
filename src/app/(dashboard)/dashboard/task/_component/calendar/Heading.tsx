'use client';
import { getCalenderSettings } from '@/actions/task/getCalendarSettings';
import { DropdownSelection } from '@/components/DropDownSelection';
import { CalendarType } from '@/types/calendar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { appointmentQueryKey, calenderQueryKey } from '../../_constant';
import DisplayDate from './DisplayDate';
import Settings from './Settings';
import CalendarSearch from './CalendarSearch';
import moment from 'moment';
import { useCalendarStore } from '@/stores/calendarStore';
import ArrowButton from './ArrowButton';
import { AppointmentCreateOrEdit } from '@/components/appointment/AppointmentCreateOrEdit';
import { useSession } from 'next-auth/react';
import DateSelector from './DateSelector';
import { useDate } from '../../_hook/lib/useDate';
import useMonth from '../../_hook/lib/useMonth';
import useWeekStartEndDays from '../../_hook/lib/useWeekStartEndDays';
import { Appointment, Lead } from '@prisma/client';
import { updatePipelineAutomationTrigger } from '@/actions/automation/pipeline/triggerPipelineAutomation';
import { errorHandler } from '@/error-boundary/globalErrorHandler';

type THeadingProps = {
  type: CalendarType;
};

const BUTTON_STYLE = 'app-shadow rounded-md p-2 text-[#797979]';
const DROPDOWN_STYLE =
  'app-shadow rounded-md bg-background px-3 py-2 text-[#797979] capitalize';

const ALLOWED_ROLES_FOR_NEW_APPOINTMENT = ['Admin', 'Manager', 'Sales'];

export default function Heading({ type }: THeadingProps) {
  const date = useDate();
  const dateFormat = date.format('YYYY-MM-DD');
  const month = useMonth();
  const formattedMonth = month
    ? moment(month, 'YYYY-MM').format('MMMM')
    : moment().format('MMMM');

  const formattedYear = month
    ? moment(month, 'YYYY-MM').year()
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
  const calenderQueryType = type === 'day' ? 'date' : type;
  const { setDate, setNavigating } = useCalendarStore();

  const handleTodayClick = () => {
    const today = moment().format('YYYY-MM-DD');
    setDate(today);

    if (type !== 'day') {
      // Set navigation flag to prevent reset, then navigate
      setNavigating(true);
      router.push('day');

      // Clear navigation flag after a short delay to allow navigation to complete
      // setTimeout(() => setNavigating(false), 30000);
    }
  };

  const handleAppointmentCreate = async (
    newAppointment: Appointment & { lead: Lead | null }
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
          condition: 'APPOINTMENT_SCHEDULED',
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
        <div className="mb-2 hidden w-full md:mb-0 lg:block lg:w-64">
          <CalendarSearch type={type} />
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
          {' '}
          <DropdownSelection
            dropDownValues={['day', 'week', 'month']}
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
          user?.employeeType ?? ''
        ) && (
          <AppointmentCreateOrEdit
            onAppointmentCreated={handleAppointmentCreate}
          />
        )}

        <Settings />

        {/* Mobile Search */}
        <div className="my-2 block w-full md:mb-0 lg:hidden">
          <CalendarSearch type={type} />
        </div>
      </div>
    </div>
  );
}
