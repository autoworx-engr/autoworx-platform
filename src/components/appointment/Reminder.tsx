import { deleteTemplate } from "@/actions/appointment/deleteTemplate";
import { emailTemplateQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";
import NewTemplate from "@/components/Lists/NewTemplate";
import Selector from "@/components/Selector";
import { Switch } from "@/components/Switch";
import ConfirmModal from "@/components/ui/ConfirmModal";
import useTemplatesQuery from "@/hooks/query-hook/useTemplatesQuery";
import { useFormErrorStore } from "@/stores/form-error";
import type { Client, EmailTemplate, Vehicle } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { CircleAlert, FileText, UserRoundX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import UpdateTemplate from "./UpdateTemplate";

type TReminderProps = {
  client: Partial<Client> | null;
  vehicle: Partial<Vehicle> | null;
  startTime: string;
  date: string;
  confirmationTemplate: EmailTemplate | null;
  setConfirmationTemplate: React.Dispatch<
    React.SetStateAction<EmailTemplate | null>
  >;
  reminderTemplate: EmailTemplate | null;
  setReminderTemplate: React.Dispatch<
    React.SetStateAction<EmailTemplate | null>
  >;
  confirmationTemplateStatus: boolean;
  setConfirmationTemplateStatus: (status: boolean) => void;
  reminderTemplateStatus: boolean;
  setReminderTemplateStatus: (status: boolean) => void;
  openConfirmation: boolean;
  openReminder: boolean;
  setOpenReminder: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenConfirmation: React.Dispatch<React.SetStateAction<boolean>>;
  /** Reminders also go to assigned team mates, so they count as recipients. */
  hasAssignedUsers?: boolean;
  fromEdit?: boolean;
};

export function Reminder({
  client,
  vehicle,
  startTime,
  date,
  confirmationTemplate,
  setConfirmationTemplate,
  reminderTemplate,
  setReminderTemplate,
  confirmationTemplateStatus,
  setConfirmationTemplateStatus,
  reminderTemplateStatus,
  setReminderTemplateStatus,
  openConfirmation,
  openReminder,
  setOpenReminder,
  setOpenConfirmation,
  fromEdit = false,
  hasAssignedUsers = false,
}: TReminderProps) {
  const initializedClientIdRef = useRef<number | null>(null);
  const previousReminderTemplateIdRef = useRef<number | null>(null);

  // Reminders can go to assigned team mates alone, so a client is optional
  // here. Build the name defensively rather than interpolating possibly-absent
  // fields, which rendered "undefined undefined" in the template preview.
  const clientName =
    [client?.firstName, client?.lastName].filter(Boolean).join(" ") || "";

  const { data: templates = [] } = useTemplatesQuery();

  const confirmationTemplates = useMemo(
    () => templates.filter((t: EmailTemplate) => t.type === "Confirmation"),
    [templates],
  );
  const reminderTemplates = useMemo(
    () => templates.filter((t: EmailTemplate) => t.type === "Reminder"),
    [templates],
  );

  const [templateToDelete, setTemplateToDelete] = useState<{
    id: number;
    type: "Confirmation" | "Reminder";
    subject: string;
  } | null>(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);

  const queryClient = useQueryClient();
  const { clearError } = useFormErrorStore();

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  useEffect(() => {
    if (openReminder) {
      setOpenConfirmation(false);
    }
  }, [openReminder, setOpenConfirmation]);

  useEffect(() => {
    if (openConfirmation) {
      setOpenReminder(false);
    }
  }, [openConfirmation, setOpenReminder]);

  useEffect(() => {
    // On edit the templates and toggles come from the saved appointment, so
    // defaulting them here would overwrite what was loaded.
    if (fromEdit) return;

    // Reminders can be for assigned team mates only, so default the templates
    // even with no client. `0` stands in for "no client" so switching between
    // no-client and a real client still re-runs exactly once each.
    const clientKey = client?.id ?? 0;
    if (initializedClientIdRef.current === clientKey) {
      return;
    }

    const firstConfirmationTemplate = templates.find(
      (template: EmailTemplate) => template.type === "Confirmation",
    );
    const firstReminderTemplate = templates.find(
      (template: EmailTemplate) => template.type === "Reminder",
    );

    // New appointments default both switches on, so a freshly booked
    // appointment notifies people unless the user opts out.
    setConfirmationTemplate(firstConfirmationTemplate ?? null);
    setReminderTemplate(firstReminderTemplate ?? null);
    setConfirmationTemplateStatus(Boolean(firstConfirmationTemplate));
    setReminderTemplateStatus(Boolean(firstReminderTemplate));
    initializedClientIdRef.current = clientKey;
  }, [
    client?.id,
    templates,
    fromEdit,
    setConfirmationTemplate,
    setReminderTemplate,
    setConfirmationTemplateStatus,
    setReminderTemplateStatus,
  ]);

  // Confirmation is never armed automatically — the user turns it on with the
  // switch or by choosing a template (see the dropdown's onSelect), so there is
  // deliberately no template-id watcher for it the way there is for reminders.
  useEffect(() => {
    const currentTemplateId = reminderTemplate?.id ?? null;

    if (
      currentTemplateId !== null &&
      currentTemplateId !== previousReminderTemplateIdRef.current
    ) {
      setReminderTemplateStatus(true);
    }

    previousReminderTemplateIdRef.current = currentTemplateId;
  }, [reminderTemplate?.id, setReminderTemplateStatus]);

  async function handleDelete({ id, type }: { id: number; type: string }) {
    await deleteTemplate(id);

    if (type === "Confirmation") {
      // remove this template from the array
      setConfirmationTemplate(null);
      setConfirmationTemplateStatus(false);
    } else {
      // remove this template from the array
      setReminderTemplate(null);
      setReminderTemplateStatus(false);
    }

    queryClient.invalidateQueries({
      queryKey: [emailTemplateQueryKey.templates],
    });
  }

  async function handleConfirmDeleteTemplate() {
    if (!templateToDelete || isDeletingTemplate) return;

    try {
      setIsDeletingTemplate(true);
      await handleDelete(templateToDelete);
      setTemplateToDelete(null);
    } finally {
      setIsDeletingTemplate(false);
    }
  }

  // Nobody to remind yet — a client or at least one assigned team mate is
  // needed before these templates mean anything.
  if (!client && !hasAssignedUsers) {
    return (
      <div className="flex h-full min-h-[300px] w-full flex-1 flex-col items-center justify-center gap-4 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-100">
          <UserRoundX size={40} strokeWidth={1.5} className="text-slate-300" />
          <div className="absolute inset-0 animate-ping rounded-full bg-slate-200/30 opacity-20" />
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold tracking-tight text-slate-700">
            No Recipient Yet
          </h3>
          <p className="mx-auto max-w-[260px] text-sm font-medium text-slate-400">
            Select a client or assign a team mate to set up confirmation and
            reminder emails.
          </p>
        </div>

        <div className="mt-2 h-1 w-12 rounded-full bg-primary/20" />
      </div>
    );
  }

  return (
    <>
      {/* No min-width: 350px overflowed narrow phones. Vertical-only padding
          so the parent controls horizontal alignment. */}
      <div className="w-full space-y-4 py-2">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-slate-600">Confirmation</h2>
          <Switch
            name="confirmation"
            className="ml-auto scale-75"
            checked={confirmationTemplateStatus}
            setChecked={setConfirmationTemplateStatus}
          />
        </div>

        <Selector
          className="min-w-full"
          border
          clickabled={true}
          label={(template: EmailTemplate | null) =>
            template ? template.subject : "Template"
          }
          newButton={
            <NewTemplate
              type="Confirmation"
              clientName={clientName}
              vehicleModel={vehicle?.model!}
              setTemplate={setConfirmationTemplate}
              setOpenTemplate={setOpenConfirmation}
              date={date}
              startTime={startTime}
            />
          }
          items={confirmationTemplates}
          displayList={(template: EmailTemplate) => (
            <div className="group relative flex items-center justify-between">
              <div className="flex items-center gap-3 text-left outline-none">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200 group-hover:bg-primary/10 group-hover:ring-primary/20 transition-colors">
                  <FileText className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                </div>
                <span className="text-sm font-semibold text-slate-600 transition-colors group-hover:text-slate-900">
                  {template.subject}
                </span>
              </div>

              <div className="flex items-center gap-1 transition-opacity duration-200 group-hover:opacity-100">
                <div
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100/50 p-1 ring-1 ring-slate-200/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <UpdateTemplate
                    id={template.id}
                    subject={template.subject}
                    message={template.message || ""}
                  />

                  <div className="h-4 w-[1px] bg-slate-200" />

                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-all bg-rose-50 text-rose-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTemplateToDelete({
                        id: template.id,
                        type: "Confirmation",
                        subject: template.subject,
                      });
                    }}
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          )}
          selectedItem={confirmationTemplate}
          onSelect={(template) => {
            setConfirmationTemplate(template);
            setConfirmationTemplateStatus(Boolean(template));
            setOpenConfirmation(false);
          }}
          onSearch={(search: string) =>
            confirmationTemplates.filter((template) =>
              template.subject.toLowerCase().includes(search.toLowerCase()),
            )
          }
          openState={[openConfirmation, setOpenConfirmation]}
        />
      </div>
      {/* No min-width: 350px overflowed narrow phones. Vertical-only padding
          so the parent controls horizontal alignment. */}
      <div className="w-full space-y-4 py-2">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-slate-600">Reminder</h2>
          <Switch
            name="reminder"
            className="ml-auto scale-75"
            checked={reminderTemplateStatus}
            setChecked={setReminderTemplateStatus}
          />
        </div>

        <Selector
          className="min-w-full"
          border
          clickabled={true}
          label={(template: EmailTemplate | null) =>
            template ? template.subject : "Template"
          }
          newButton={
            <NewTemplate
              type="Reminder"
              clientName={clientName}
              vehicleModel={vehicle?.model!}
              setTemplate={setReminderTemplate}
              setOpenTemplate={setOpenReminder}
              date={date}
              startTime={startTime}
            />
          }
          items={reminderTemplates}
          displayList={(template: EmailTemplate) => (
            <div className="group relative flex items-center justify-between">
              <div className="flex items-center gap-3 text-left outline-none">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200 group-hover:bg-primary/10 group-hover:ring-primary/20 transition-colors">
                  <FileText className="h-4 w-4 text-slate-400 group-hover:text-primary" />
                </div>
                <span className="text-sm font-semibold text-slate-600 transition-colors group-hover:text-slate-900">
                  {template.subject}
                </span>
              </div>

              <div className="flex items-center gap-1 transition-opacity duration-200 group-hover:opacity-100">
                <div
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100/50 p-1 ring-1 ring-slate-200/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <UpdateTemplate
                    id={template.id}
                    subject={template.subject}
                    message={template.message || ""}
                  />

                  <div className="h-4 w-[1px] bg-slate-200" />

                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-all bg-rose-50 text-rose-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTemplateToDelete({
                        id: template.id,
                        type: "Reminder",
                        subject: template.subject,
                      });
                    }}
                  >
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          )}
          selectedItem={reminderTemplate}
          onSelect={(template) => {
            setReminderTemplate(template);
            setReminderTemplateStatus(Boolean(template));
            setOpenReminder(false);
          }}
          onSearch={(search: string) =>
            reminderTemplates.filter((template) =>
              template.subject.toLowerCase().includes(search.toLowerCase()),
            )
          }
          openState={[openReminder, setOpenReminder]}
        />
      </div>

      <div className="flex items-start gap-2 py-2 text-sm text-yellow-800">
        <CircleAlert className="mt-1 h-5 w-5 flex-shrink-0 text-yellow-600" />
        <div className="flex-1 min-w-0">
          <p className="leading-relaxed break-words">
            Your client and the assigned team mates will receive automated
            reminders <strong>24 hours</strong> and <strong>2 hours</strong>{" "}
            prior to the scheduled appointment.
          </p>
        </div>
      </div>

      <ConfirmModal
        open={!!templateToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeletingTemplate) setTemplateToDelete(null);
        }}
        title="Delete template?"
        description={
          templateToDelete
            ? `"${templateToDelete.subject}" will be permanently deleted and can no longer be used as a ${templateToDelete.type.toLowerCase()} template on any appointment.`
            : undefined
        }
        confirmText="Delete"
        destructive
        loading={isDeletingTemplate}
        onConfirm={handleConfirmDeleteTemplate}
      />
    </>
  );
}
