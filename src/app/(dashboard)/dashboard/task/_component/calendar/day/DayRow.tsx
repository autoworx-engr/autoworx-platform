import { AppointmentCreateOrEdit } from '@/components/appointment/AppointmentCreateOrEdit';
import { cn } from '@/lib/cn';
import { formatTime } from '@/utils/taskAndActivity';
import { useQueryClient } from '@tanstack/react-query';
import moment, { Moment } from 'moment';
import { useEffect, useState } from 'react';
import { appointmentQueryKey } from '../../../_constant';
import useSettingsQuery from '../../../_hook/settings/query/useSettingsQuery';
import { Appointment, Lead } from '@prisma/client';
import { updatePipelineAutomationTrigger } from '@/actions/automation/pipeline/triggerPipelineAutomation';
import { errorHandler } from '@/error-boundary/globalErrorHandler';

type TProps = {
  row: any;
  rows: any;
  index: number;
  onDrop: (event: React.DragEvent, rowIndex: number) => void;
  date: Date | string | Moment;
};

export default function DayRow({ row, index, rows, onDrop, date }: TProps) {
  const { data: settings } = useSettingsQuery();
  const [draggedOverRow, setDraggedOverRow] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const rowTime = formatTime(row);

  const [dateRangeForBgChanger, setDateRangeForBgChanger] = useState(false);

  useEffect(() => {
    if (settings?.dayStart && settings?.dayEnd) {
      const dateRangeForBgChanger =
        rowTime >= settings?.dayStart && rowTime <= settings?.dayEnd;
      setDateRangeForBgChanger(dateRangeForBgChanger);
    }
  }, [rowTime, settings]);

  const handleAppointmentCreate = async (
    newAppointment: Appointment & { lead: Lead | null }
  ) => {
    try {
      queryClient.invalidateQueries({
        queryKey: [
          appointmentQueryKey.allAppointments,
          moment(date).format('YYYY-MM-DD'),
        ],
      });
      if (newAppointment?.lead?.columnId && newAppointment?.lead?.companyId) {
        await updatePipelineAutomationTrigger({
          condition: 'APPOINTMENT_SCHEDULED',
          companyId: newAppointment?.lead?.companyId,
          leadId: newAppointment?.lead?.id,
          columnId: newAppointment?.lead?.columnId,
        });
      }
    } catch (err) {
      // console.error("Error creating appointment:", err);
      errorHandler(err);
    }
  };

  return (
    <div key={index} className="relative">
      <div
        className={cn(
          'absolute -top-[37.5px] flex h-full w-[100px] items-center justify-center text-[19px]',
          index === 0 && '-top-6 text-base'
        )}
        style={{
          color: dateRangeForBgChanger ? '#7575a3' : '#d1d1e0',
        }}
      >
        {index === 0 ? 'GMT+00' : row}
      </div>

      <AppointmentCreateOrEdit
        defaultDate={date.toString()}
        defaultStartTime={formatTime(row)}
        onAppointmentCreated={handleAppointmentCreate}
        triggerIcon={
          <button
            type="button"
            onDrop={(event: React.DragEvent) => {
              onDrop(event, index);
              setDraggedOverRow(null);
            }}
            onDragOver={(event: React.DragEvent) => {
              event.preventDefault();
              setDraggedOverRow(index);
            }}
            onDragLeave={() => setDraggedOverRow(null)}
            className={cn(
              'ml-[85px] block h-[75px] border-neutral-200',
              index !== rows.length && 'border-b border-l',
              index !== 0 ? 'cursor-pointer' : 'border-t'
            )}
            disabled={index === 0}
            style={{
              backgroundColor:
                draggedOverRow === index
                  ? '#c4c4c4'
                  : dateRangeForBgChanger
                    ? ' white	'
                    : '#f2f2f2',
              width: 'calc(100% - 85px)',
            }}
          >
            {/* Row heading */}
          </button>
        }
      />
    </div>
  );
}
