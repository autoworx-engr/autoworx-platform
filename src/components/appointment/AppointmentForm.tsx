"use client";

import FormError from "@/components/FormError";
import { SlimInput } from "@/components/SlimInput";
import { cn } from "@/lib/cn";
import type { User } from "@prisma/client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Select } from "antd";
import { Bell, Calendar, ChevronDown, Hash, Plus, Search } from "lucide-react";
import moment from "moment-timezone";
import { customAlphabet } from "nanoid";
import AssignUsers from "./AssignUsers";
import { Reminder } from "./Reminder";
import ScheduleTab from "./ScheduleTab";
import { SelectAppointmentClient } from "./SelectAppointmentClient";
import { SelectAppointmentServiceCategory } from "./SelectAppointmentServiceCategory";
import { SelectAppointmentVehicle } from "./SelectAppointmentVehicle";
import { Tab, type AppointmentFormState } from "./useAppointmentFormState";

type AppointmentFormProps = AppointmentFormState & {
  fromLead?: boolean;
  fromEdit?: boolean;
  clientId?: number | null;
  vehicleId?: number | null;
  setIsAppointmentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  appointmentId?: number;
};

export default function AppointmentForm({
  fromLead = false,
  fromEdit,
  clientId,
  vehicleId,
  setIsAppointmentModalOpen,
  // state
  tab,
  setTab,
  title,
  setTitle,
  date,
  setDate,
  startTime,
  endTime,
  handleTimeChange,
  allDay,
  setAllDay,
  notes,
  setNotes,
  client,
  setClient,
  clientOpenDropdown,
  setClientOpenDropdown,
  vehicle,
  setVehicle,
  vehicleOpenDropdown,
  setVehicleOpenDropdown,
  serviceCategoryId,
  setServiceCategoryId,
  draft,
  setDraft,
  draftOpen,
  setDraftOpen,
  draftSearch,
  setDraftSearch,
  filteredDraftEstimateOptions,
  selectedDraftOption,
  assignedUsers,
  setAssignedUsers,
  times,
  setTimes,
  confirmationTemplate,
  setConfirmationTemplate,
  reminderTemplate,
  setReminderTemplate,
  confirmationTemplateStatus,
  setConfirmationTemplateStatus,
  reminderTemplateStatus,
  setReminderTemplateStatus,
  openConfirmation,
  setOpenConfirmation,
  openReminder,
  setOpenReminder,
  timeOptions,
  rows,
  containerRef,
  settings,
  handleDate,
}: AppointmentFormProps) {
  const { Option } = Select;

  return (
    <div className="h-full sm:h-full overflow-y-auto thin-scrollbar">
      <div className="space-y-4 p-6">
        <FormError />

        <AppointmentTitleSelectAndAdd
          value={title}
          onChange={(value) => setTitle(value)}
        />

        <div className="flex flex-wrap items-end gap-2 2xl:flex-nowrap">
          <SlimInput
            name="date"
            label="Date"
            rootClassName="grow"
            type="date"
            value={date ?? ""}
            required
            onChange={(event) => {
              const newDate = moment(event.currentTarget.value).format(
                "YYYY-MM-DD",
              );
              setDate(newDate);
            }}
          />

          <div className="flex items-end gap-2">
            <label className="flex flex-col items-start">
              <span className="mb-2 font-medium text-slate-600">
                Start Time <span className="text-[#E9405F]">*</span>
              </span>
              <div>
                <Select
                  value={startTime}
                  onChange={(value) =>
                    handleTimeChange({ target: { value } } as any, "start")
                  }
                  style={{ width: "100%" }}
                  className="
                    h-[38px] w-full
                    rounded-lg border-none
                    bg-slate-50/50
                    ring-1 ring-slate-200
                    transition-all duration-300
                    hover:bg-white hover:ring-[#6571FF]/80 hover:scale-[1.01] hover:shadow-sm
                    focus-within:ring-2 focus-within:ring-[#6571FF]/40 focus:outline-none
                    text-slate-600 font-medium thin-scrollbar
                  "
                  dropdownClassName="rounded-xl border-none shadow-2xl backdrop-blur-md bg-white/90"
                >
                  {timeOptions.map((time) => (
                    <Option
                      key={time.value}
                      value={time.value}
                      className="py-2 px-3 text-slate-600 transition-colors hover:bg-[#6571FF]/10 hover:text-[#6571FF]"
                    >
                      <p className="text-base text-gray-600">{time.label}</p>
                    </Option>
                  ))}
                </Select>
              </div>
            </label>

            <label className="flex flex-col items-start">
              <span className="mb-2 font-medium text-slate-600">
                End Time <span className="text-[#E9405F]">*</span>
              </span>
              <Select
                value={endTime}
                onChange={(value) =>
                  handleTimeChange({ target: { value } } as any, "end")
                }
                style={{ width: "100%" }}
                className="
                    h-[38px] w-full
                    rounded-lg border-none
                    bg-slate-50/50
                    ring-1 ring-slate-200
                    transition-all duration-300
                    hover:bg-white hover:ring-[#6571FF]/80 hover:scale-[1.01] hover:shadow-sm
                    focus-within:ring-2 focus-within:ring-[#6571FF]/40 focus:outline-none
                    text-slate-600 font-medium thin-scrollbar
                  "
                dropdownClassName="rounded-xl border-none shadow-2xl backdrop-blur-md bg-white/90"
              >
                {timeOptions.map((time) => (
                  <Option
                    key={time.value}
                    value={time.value}
                    className="py-2 px-3 text-slate-600 transition-colors hover:bg-[#6571FF]/10 hover:text-[#6571FF]"
                  >
                    {time.label}
                  </Option>
                ))}
              </Select>
            </label>
          </div>
        </div>

        <div className="flex items-center">
          <input
            checked={allDay}
            onChange={() => setAllDay(!allDay)}
            id="all-day"
            type="checkbox"
            value="true"
            className="h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
            name="all-day"
          />
          <label
            htmlFor="all-day"
            className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
          >
            All day
          </label>
        </div>

        <AssignUsers
          assignedUsers={assignedUsers.filter(
            (user) => user.employeeType === "Sales",
          )}
          title="+ Assign Sales Person"
          employeeType="Sales"
          onAssignUser={(user: User) =>
            setAssignedUsers((prev) => [...prev, user])
          }
          onRemoveAssignedUser={(user: User) =>
            setAssignedUsers((prev) => prev.filter((u) => u.id !== user.id))
          }
        />

        <AssignUsers
          assignedUsers={assignedUsers.filter(
            (user) => user.employeeType === "Technician",
          )}
          title="+ Assign Technician"
          employeeType="Technician"
          onAssignUser={(user: User) =>
            setAssignedUsers((prev) => [...prev, user])
          }
          onRemoveAssignedUser={(user: User) =>
            setAssignedUsers((prev) => prev.filter((u) => u.id !== user.id))
          }
        />
      </div>

      <div className="row-start-2 space-y-4 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectAppointmentClient
            clientId={clientId}
            fromLead={fromLead}
            value={client}
            setValue={setClient}
            openDropdown={clientOpenDropdown}
            setOpenDropdown={setClientOpenDropdown}
            setIsAppointmentModalOpen={setIsAppointmentModalOpen}
          />
          <SelectAppointmentVehicle
            vehicleId={vehicleId}
            fromLead={fromLead}
            clientId={client?.id ?? clientId}
            value={vehicle}
            setValue={setVehicle}
            openDropdown={vehicleOpenDropdown}
            setOpenDropdown={setVehicleOpenDropdown}
            setIsAppointmentModalOpen={setIsAppointmentModalOpen}
          />
          <SelectAppointmentServiceCategory
            value={serviceCategoryId}
            setValue={setServiceCategoryId}
          />

          <div className="w-full">
            <DropdownMenu.Root open={draftOpen} onOpenChange={setDraftOpen}>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDraftOpen(!draftOpen);
                  }}
                  className={cn(
                    "flex h-11 w-full items-center justify-between rounded-xl px-4 py-2 text-sm transition-all",
                    "border border-slate-200 bg-white shadow-sm hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900",
                    "focus:outline-none focus:ring-2 focus:ring-[#6571FF]/40",
                    draftOpen && "ring-2 ring-[#6571FF]/40 border-[#6571FF]",
                  )}
                >
                  <div className="flex flex-col items-start overflow-hidden text-left">
                    {selectedDraftOption ? (
                      <>
                        <span className="w-full text-sm truncate font-semibold text-slate-900 dark:text-white">
                          {selectedDraftOption.vehicle}
                        </span>
                        <span className="text-xs text-slate-500">
                          ID: {selectedDraftOption.id} • $
                          {selectedDraftOption.price.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-500">
                        Select Draft Estimate
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    size={18}
                    className={cn(
                      "text-slate-400 transition-transform",
                      draftOpen && "rotate-180",
                    )}
                  />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  sideOffset={8}
                  className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-[300px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl animate-in fade-in zoom-in-95 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="relative mb-1 flex items-center p-2">
                    <Search className="absolute left-4 h-4 w-4 text-slate-400" />
                    <input
                      className="w-full rounded-lg bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none dark:bg-slate-800"
                      placeholder="Search ID or Vehicle..."
                      value={draftSearch}
                      onChange={(e) => setDraftSearch(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="max-h-72 overflow-y-auto overflow-x-hidden px-1">
                    {filteredDraftEstimateOptions.length > 0 ? (
                      filteredDraftEstimateOptions.map((item) => (
                        <DropdownMenu.Item
                          key={item.id}
                          onSelect={() => {
                            setDraft(item.id);
                            setDraftOpen(false);
                          }}
                          className="group flex cursor-pointer flex-col gap-1 rounded-lg px-3 py-2.5 outline-none hover:bg-slate-50 data-[highlighted]:bg-[#6571FF]/10 dark:hover:bg-slate-800"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                              {item.vehicle}
                            </div>
                            <span className="text-sm font-bold text-[#6571FF]">
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Hash size={10} />
                            {item.id}
                          </div>
                        </DropdownMenu.Item>
                      ))
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No results found
                      </div>
                    )}
                  </div>

                  <div className="mt-1 border-t border-slate-100 p-2 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(customAlphabet("1234567890", 10)());
                        setDraftOpen(false);
                      }}
                      disabled={!client || !vehicle}
                      className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-lg bg-[#6571FF] py-2.5 text-sm font-semibold text-white transition-opacity",
                        "hover:opacity-90 active:scale-[0.98]",
                        (!client || !vehicle) &&
                          "cursor-not-allowed opacity-60",
                      )}
                    >
                      <Plus size={16} />
                      New Draft Estimate
                    </button>
                  </div>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>

        <div className="relative w-full">
          <textarea
            name="notes"
            placeholder="Notes"
            className={cn(
              "h-20 w-full rounded-md border border-slate-300 outline-none bg-background px-2 py-0.5 leading-6 transition-all duration-300 thin-scrollbar",
              "bg-white/80 backdrop-blur-sm",
              "text-slate-600 placeholder:text-slate-400",
              "focus:border-[#6571FF]/60 focus:ring-2 focus:ring-[#6571FF]/40",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
          />
          <span className="absolute -bottom-2 right-2 text-xs text-slate-400 pointer-events-none">
            {notes.length}/1000
          </span>
        </div>
      </div>

      {/* Mobile tab switcher */}
      <div className="sticky top-0 z-40 bg-white w-full pb-2">
        <div className="flex lg:hidden items-center justify-self-center rounded-full bg-slate-100 p-1.5 shadow-inner ring-1 ring-slate-200/50">
          <button
            type="button"
            className={cn(
              "flex items-center justify-center rounded-full px-6 py-2 text-sm font-bold transition-all duration-300 ease-out",
              tab === Tab.Schedule
                ? "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50",
            )}
            onClick={() => setTab(Tab.Schedule)}
          >
            <Calendar
              className={cn(
                "mr-2 transition-colors",
                tab === Tab.Schedule ? "text-slate-600" : "text-slate-400",
              )}
              size={18}
              strokeWidth={2.5}
            />
            Schedule
          </button>

          <button
            type="button"
            className={cn(
              "flex items-center justify-center rounded-full px-6 py-2 text-sm font-bold transition-all duration-300 ease-out",
              tab === Tab.Reminder
                ? "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50",
            )}
            onClick={() => setTab(Tab.Reminder)}
          >
            <Bell
              className={cn(
                "mr-2 transition-colors",
                tab === Tab.Reminder ? "text-slate-600" : "text-slate-400",
              )}
              size={18}
              strokeWidth={2.5}
            />
            Reminder
          </button>
        </div>
      </div>

      {/* Mobile right panel */}
      <div className="relative lg:hidden h-full row-span-2 thin-scrollbar divide-y bg-background">
        {tab === Tab.Schedule ? (
          <div
            ref={containerRef}
            className="absolute inset-0 divide-y overflow-y-auto h-full"
          >
            <ScheduleTab
              rows={rows}
              date={date}
              startTime={startTime || ""}
              endTime={endTime}
              settings={settings}
              onDateUpDown={(direction: "+" | "-") => handleDate(direction)}
            />
          </div>
        ) : tab === Tab.Reminder ? (
          <Reminder
            client={client}
            vehicle={vehicle}
            startTime={startTime!}
            date={date!}
            times={times}
            setTimes={setTimes}
            confirmationTemplate={confirmationTemplate}
            setConfirmationTemplate={setConfirmationTemplate}
            reminderTemplate={reminderTemplate}
            setReminderTemplate={setReminderTemplate}
            confirmationTemplateStatus={confirmationTemplateStatus}
            setConfirmationTemplateStatus={setConfirmationTemplateStatus}
            reminderTemplateStatus={reminderTemplateStatus}
            setReminderTemplateStatus={setReminderTemplateStatus}
            openConfirmation={openConfirmation}
            openReminder={openReminder}
            setOpenReminder={setOpenReminder}
            setOpenConfirmation={setOpenConfirmation}
          />
        ) : null}
      </div>
    </div>
  );
}

// Forward declaration to avoid circular import — AppointmentTitleSelectAndAdd lives in the same folder
import AppointmentTitleSelectAndAdd from "./AppointmentTitleSelectAndAdd";
