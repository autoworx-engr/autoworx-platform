"use client";

import FormError from "@/components/FormError";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { TimeScrollPicker } from "@/components/ui/TimeScrollPicker";
import { cn } from "@/lib/cn";
import { errorToast } from "@/lib/toast";
import { addMinutes } from "@/utils/time";
import type { User } from "@prisma/client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
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
  endDate,
  setEndDate,
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
  draftOptionsLoading,
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
  timezone,
}: AppointmentFormProps) {
  return (
    <div className="h-full sm:h-full overflow-y-auto thin-scrollbar max-h-[80vh] lg:max-h-none">
      <div className="space-y-2 p-4 sm:p-6">
        <FormError />

        <AppointmentTitleSelectAndAdd
          value={title}
          onChange={(value) => setTitle(value)}
        />

        <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-4">
          <DatePickerField
            label="Start Date"
            required
            value={date ?? ""}
            onChange={(value) => {
              const newDate = value ? moment(value).format("YYYY-MM-DD") : "";
              setDate(newDate);
              if (endDate && newDate && endDate < newDate) {
                setEndDate(undefined);
              }
            }}
          />

          <DatePickerField
            label="End Date"
            clearable
            value={endDate ?? ""}
            onChange={(value) => {
              if (!value) {
                setEndDate(undefined);
                return;
              }
              const newEnd = moment(value).format("YYYY-MM-DD");
              // End date cannot be before the start date.
              if (date && newEnd < date) {
                errorToast("End date cannot be before the start date.");
                return;
              }
              setEndDate(newEnd);
            }}
          />

          <TimeScrollPicker
            id="apptStartTime"
            label="Start Time"
            required
            value={startTime || ""}
            maxTime="22:45"
            onChange={(value) =>
              handleTimeChange({ target: { value } } as any, "start")
            }
          />

          <TimeScrollPicker
            id="apptEndTime"
            label="End Time"
            required
            value={endTime || ""}
            // Same-day appointments must end after they start; for multi-day the
            // end time sits on a later date, so no lower bound applies.
            minTime={
              endDate && date && endDate > date
                ? undefined
                : startTime
                  ? addMinutes(startTime, 15)
                  : undefined
            }
            onChange={(value) =>
              handleTimeChange({ target: { value } } as any, "end")
            }
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="all-day"
            checked={allDay}
            onCheckedChange={() => setAllDay(!allDay)}
          />
          <Label htmlFor="all-day" className="text-sm">
            All day
          </Label>
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

      <div className="row-start-2 space-y-3 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                    // Mirrors the Selector trigger (h-10 / rounded-lg / px-4 /
                    // ring-1) used by the Client, Vehicle and Service Category
                    // fields so all four controls in this grid match height.
                    "group flex h-10 w-full items-center justify-between rounded-lg px-4 text-sm outline-none transition-all duration-300",
                    "bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm hover:shadow-md",
                    "ring-1 ring-slate-200 dark:ring-slate-800",
                    draftOpen
                      ? "ring-2 ring-primary/60 border-transparent"
                      : "hover:ring-slate-300",
                  )}
                >
                  <div className="min-w-0 flex-1 overflow-hidden text-left">
                    {selectedDraftOption ? (
                      <div className="flex min-w-0 items-baseline gap-1.5">
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {selectedDraftOption.vehicle}
                        </span>
                        <span className="shrink-0 text-[11px] text-slate-500">
                          ID: {selectedDraftOption.id} • $
                          {selectedDraftOption.price.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500">
                        Select Invoice/Estimate
                      </span>
                    )}
                  </div>
                  {draftOptionsLoading ? (
                    <Spinner className="size-4 shrink-0 text-primary" />
                  ) : (
                    <ChevronDown
                      size={18}
                      className={cn(
                        "text-slate-400 transition-transform",
                        draftOpen && "rotate-180",
                      )}
                    />
                  )}
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
                      placeholder="Search by ID or Vehicle..."
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
                          className="group flex cursor-pointer flex-col gap-1 rounded-lg px-3 py-2.5 outline-none hover:bg-slate-50 data-[highlighted]:bg-primary/10 dark:hover:bg-slate-800"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                                {item.vehicle}
                              </span>
                            </div>
                            <span className="shrink-0 text-sm font-bold text-primary">
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Hash size={10} />
                            {item.id}{" "}
                            <span
                              className={cn(
                                "shrink-0 rounded px-1.5 text-[8px] font-bold uppercase tracking-wide",
                                item.type === "Invoice"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-violet-100 text-violet-700",
                              )}
                            >
                              {item.type}
                            </span>
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
                        "flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-opacity",
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
          <Textarea
            name="notes"
            placeholder="Notes"
            className="max-h-[220px] min-h-[96px] resize-y thin-scrollbar"
            rows={3}
            maxLength={1000}
            value={notes}
            onChange={(event) => setNotes(event.currentTarget.value)}
          />
          <span className="pointer-events-none absolute -bottom-5 right-1 text-xs text-muted-foreground">
            {notes.length}/1000
          </span>
        </div>
      </div>

      {/* Mobile tab switcher */}
      <div className="sticky top-0 z-40 w-full bg-white px-4 pb-2 pt-3 sm:px-6">
        <div className="flex lg:hidden items-center justify-self-center rounded-full bg-slate-100 p-1.5 shadow-inner ring-1 ring-slate-200/50">
          <button
            type="button"
            className={cn(
              "flex items-center justify-center rounded-full px-6 py-2 text-sm font-bold transition-all duration-300 ease-out",
              tab === Tab.Schedule
                ? "bg-white text-primary shadow-sm ring-1 ring-slate-200"
                : "text-slate-400 hover:bg-slate-200/50 hover:text-slate-600",
            )}
            onClick={() => setTab(Tab.Schedule)}
          >
            <Calendar
              className={cn(
                "mr-2 transition-colors",
                tab === Tab.Schedule ? "text-primary" : "text-slate-400",
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
                ? "bg-white text-primary shadow-sm ring-1 ring-slate-200"
                : "text-slate-400 hover:bg-slate-200/50 hover:text-slate-600",
            )}
            onClick={() => setTab(Tab.Reminder)}
          >
            <Bell
              className={cn(
                "mr-2 transition-colors",
                tab === Tab.Reminder ? "text-primary" : "text-slate-400",
              )}
              size={18}
              strokeWidth={2.5}
            />
            Reminder
          </button>
        </div>
      </div>

      {/* Mobile right panel — horizontal padding lines its content up with the
          form sections above; Reminder's own wrappers pad vertically only. */}
      <div className="relative lg:hidden h-full row-span-2 thin-scrollbar divide-y bg-background px-4 pb-6 sm:px-6">
        {tab === Tab.Schedule ? (
          <div
            ref={containerRef}
            className="absolute inset-0 divide-y overflow-y-auto h-full"
          >
            <ScheduleTab
              rows={rows}
              date={date}
              endDate={endDate}
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
            timezone={timezone}
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
