import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Zap,
  FilePlus2,
  CalendarPlus,
  UserPlus2,
  MessageCircleWarning,
  FileUser,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AddNewEmployee from './Lists/NewEmployee';
import NewCustomer from './Lists/NewCustomer';
import { stateStore } from '@/stores/stateStore';
import { AppointmentCreateOrEdit } from './appointment/AppointmentCreateOrEdit';
import { Appointment, Lead } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { appointmentQueryKey } from '@/app/(dashboard)/dashboard/task/_constant';
import { useDate } from '@/app/(dashboard)/dashboard/task/_hook/lib/useDate';
import useMonth from '@/app/(dashboard)/dashboard/task/_hook/lib/useMonth';
import moment from 'moment';
import { updatePipelineAutomationTrigger } from '@/actions/automation/pipeline/triggerPipelineAutomation';
import useWeekStartEndDays from '@/app/(dashboard)/dashboard/task/_hook/lib/useWeekStartEndDays';
import Link from 'next/link';
import { errorHandler } from '@/error-boundary/globalErrorHandler';
import AddLeads from '@/app/(dashboard)/dashboard/pipeline/components/AddLeads';

const QuickLink = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { isClientOpen, isBugOpen, setIsBugOpen } = stateStore();
  const [isAppointmentModalOpen, setIsAppointmentOpen] = useState(false);
  const [isLeadOpen, setIsLeadOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedOutside =
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node);

      // Only close if user clicks outside and client is NOT open
      if (
        clickedOutside &&
        !isClientOpen &&
        !isAppointmentModalOpen &&
        !isLeadOpen &&
        !isBugOpen
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isClientOpen, isAppointmentModalOpen, isLeadOpen, isBugOpen]);

  const actions = [
    {
      icon: FileUser,
      label: 'Create Lead',
      onClick: () => {
        setIsLeadOpen(true);
        setIsDropdownOpen(false);
      },
    },
    {
      icon: FilePlus2,
      label: 'Create Estimate',
      onClick: () => {
        router.push('/dashboard/estimate/create');
        setIsDropdownOpen(false);
      },
    },
    {
      icon: CalendarPlus,
      label: 'New Appointment',
      onClick: () => {
        setIsDropdownOpen(false);
        setIsAppointmentOpen(true);
      },
    },
    {
      icon: UserPlus2,
      label: 'Create Client',
      onClick: () => {
        setIsDropdownOpen(false);
      },
    },
    {
      icon: MessageCircleWarning,
      label: 'Bug Report Message',
      onClick: () => {
        setIsBugOpen(true);
        setIsDropdownOpen(false);
      },
    },
  ];

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
      // console.error('Error creating appointment:', error);
      errorHandler(error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center"
      >
        <Zap className="mr-2 h-5 w-5 sm:h-7 sm:w-7 text-white sm:text-[#6571FF]" />
      </button>

      {isDropdownOpen && (
        <Card className="custom-scrollbar absolute top-10 -right-16 md:right-0 z-30 w-72 sm:w-80 max-h-80 overflow-y-auto shadow-xl">
          <CardContent className="pt-4">
            <div className="space-y-2">
              {actions.map((action, idx) => (
                <div key={idx}>
                  {action.label === 'Create Estimate' ? (
                    <Link
                      href={'/dashboard/estimate/create'}
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex cursor-pointer items-center space-x-3 rounded-lg border border-gray-200 bg-white p-3 transition hover:bg-[#F4F6FF]"
                    >
                      <action.icon className="h-5 w-5 text-[#6571FF]" />
                      <span className="text-sm font-medium text-gray-700">
                        {action.label}
                      </span>
                    </Link>
                  ) : action.label === 'Create Client' ? (
                    <div>
                      <NewCustomer
                        buttonElement={
                          <div className="flex cursor-pointer items-center space-x-3 rounded-lg border border-gray-200 bg-white p-3 transition hover:bg-[#F4F6FF]">
                            <action.icon className="h-5 w-5 text-[#6571FF]" />
                            <span className="text-sm font-medium text-gray-700">
                              {action.label}
                            </span>
                          </div>
                        }
                      />
                    </div>
                  ) : action.label === 'Create Lead' ? (
                    <AddLeads
                      buttonChild={
                        <div className="flex cursor-pointer items-center space-x-3 rounded-lg border border-gray-200 bg-white p-3 transition hover:bg-[#F4F6FF]">
                          <action.icon className="h-5 w-5 text-[#6571FF]" />
                          <span className="text-sm font-medium text-gray-700">
                            {action.label}
                          </span>
                        </div>
                      }
                      isLeadOpen={isLeadOpen}
                      setIsLeadOpen={setIsLeadOpen}
                    />
                  ) : (
                    <div
                      onClick={action.onClick}
                      className="flex cursor-pointer items-center space-x-3 rounded-lg border border-gray-200 bg-white p-3 transition hover:bg-[#F4F6FF]"
                    >
                      <action.icon className="h-5 w-5 text-[#6571FF]" />
                      <span className="text-sm font-medium text-gray-700">
                        {action.label}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Appointment */}
      <AppointmentCreateOrEdit
        isModalOpen={isAppointmentModalOpen}
        setIsModalOpen={setIsAppointmentOpen}
        onAppointmentCreated={handleAppointmentCreate}
      />
    </div>
  );
};

export default QuickLink;
