"use client";
import PipelineInvoiceModal from "@/app/(dashboard)/dashboard/pipeline/components/PipelineInvoiceModal";
import TaskForm from "@/app/(dashboard)/dashboard/pipeline/components/TaskForm";
import { AppointmentCreateOrEdit } from "@/components/appointment/AppointmentCreateOrEdit";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { Appointment, Column, User } from "@prisma/client";
import { Select } from "antd";
import { Calendar, CalendarCheck, MessageCircleMore } from "lucide-react";
import moment from "moment";
import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";

const ResponsiveSalesPipelineCard = ({
  lead,
  index,
  onCreateDraftEstimate,
  onUpdateAppointment,
  companyUsers,
  salesColumn,
  onColumnChange,
}: {
  lead: any;
  index: number;
  onCreateDraftEstimate?: (params: {
    leadId: number;
    clientId: number | undefined;
    vehicleId: number | undefined;
  }) => void;
  onUpdateAppointment?: (
    appointment: Appointment,
    meta: { leadId: number; columnId: number },
  ) => void;
  companyUsers?: User[];
  salesColumn?: Column[];
  onColumnChange?: (params: { leadId: number; newColumnId: number }) => void;
}) => {
  const [pending, startTransition] = useTransition();
  const id = lead?.id;
  const rawName = lead?.clientName
    ? lead.clientName
    : (lead?.client?.firstName ?? "") + " " + (lead?.client?.lastName ?? "");
  const clientName =
    rawName
      .replace(/\b(undefined|null)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim() || "N/A";
  const clientEmail = lead?.client?.email;
  const vehicle = lead?.vehicleInfo;
  const services = lead?.services?.split(",");
  const status = lead?.column?.title;
  const timeCreated = moment(lead?.createdAt).format("MM/DD/YYYY");

  const bgColor = lead?.column?.bgColor!;
  const textColor = lead?.column?.textColor!;

  const evenColor = "bg-background";
  const oddColor = "bg-[#EEF4FF]";

  const appointment =
    (lead?.client?.appointments?.length ?? 0) > 0
      ? lead?.client?.appointments?.[0]
      : undefined;

  const clientId = lead?.client?.id ?? undefined;
  const vehicleId = lead?.client?.vehicle?.id ?? lead?.vehicleId ?? undefined;
  const hasClient = !!clientId;
  const disabledActionClass = "cursor-not-allowed opacity-40";

  return (
    <Card
      key={index}
      className={cn(
        "mt mb-4 rounded-[5px] border border-[#BFC4FF] text-[#66738C] shadow-sm",
        (index + 1) % 2 === 0 ? evenColor : oddColor,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
        <CardTitle>
          {hasClient ? (
            <Link
              href={`/dashboard/client/${clientId}`}
              passHref
              className="block w-full text-blue-600"
            >
              {id}
            </Link>
          ) : (
            // No client page to open, so it isn't styled as a link.
            <span className="block w-full">{id}</span>
          )}
        </CardTitle>
        <CardDescription className="font-bold">{timeCreated}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-xl font-bold">{clientName}</p>
        <p className="font-medium">{clientEmail}</p>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="line-clamp-1">
              {vehicle && vehicle.length > 20
                ? vehicle.slice(0, 20) + "..."
                : vehicle || ""}
            </p>

            <p className="line-clamp-1">
              {services?.length > 0 &&
                services?.map((s: string) =>
                  s.length > 20 ? s.slice(0, 20) + "..." : s,
                )}
            </p>
          </div>
          {lead?.isQualified && salesColumn && onColumnChange ? (
            <Select
              showSearch
              value={lead.column?.id ?? " "}
              style={{ width: 140 }}
              placeholder="Select status"
              optionFilterProp="label"
              disabled={pending}
              filterSort={(optionA, optionB) =>
                (optionA?.label ?? "")
                  .toLowerCase()
                  .localeCompare((optionB?.label ?? "").toLowerCase())
              }
              options={salesColumn.map((column) => ({
                value: column.id,
                label: column.title,
              }))}
              onSelect={(value) =>
                startTransition(() =>
                  onColumnChange({
                    leadId: lead.id,
                    newColumnId: value as number,
                  }),
                )
              }
            />
          ) : (
            <p
              style={{
                backgroundColor: lead?.isQualified ? bgColor : undefined,
                color: lead?.isQualified ? textColor : undefined,
              }}
              className="rounded px-2 py-1 font-medium"
            >
              {lead?.isQualified ? status : "Unqualified"}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-4 border-t pt-3">
          {hasClient ? (
            <Link
              href={`/dashboard/communication/client/${clientId}?source=lead`}
              className="group relative"
            >
              <MessageCircleMore
                size={20}
                className="duration-300 hover:text-primary"
              />
            </Link>
          ) : (
            <span className={disabledActionClass}>
              <MessageCircleMore size={20} />
            </span>
          )}

          {onCreateDraftEstimate &&
            (lead.isEstimateCreated && lead.invoiceId ? (
              <PipelineInvoiceModal invoiceId={lead.invoiceId} />
            ) : (
              <button
                onClick={() =>
                  onCreateDraftEstimate({
                    leadId: lead.id,
                    clientId,
                    vehicleId,
                  })
                }
                disabled={!hasClient}
                className={cn(
                  "group relative",
                  !hasClient && disabledActionClass,
                )}
              >
                <div className="relative h-4 w-4">
                  <Image
                    src="/icons/draftEstimate.png"
                    alt="draftEstimate"
                    fill
                    sizes="16px"
                    className="object-contain duration-300 hover:opacity-80"
                    loading="lazy"
                  />
                </div>
              </button>
            ))}

          {onUpdateAppointment && !hasClient && (
            <span className={disabledActionClass}>
              <Calendar size={18} color="#66738C" />
            </span>
          )}

          {onUpdateAppointment && hasClient && (
            <AppointmentCreateOrEdit
              fromEdit={!!appointment}
              fromLead
              appointmentId={appointment?.id}
              triggerIcon={
                <button>
                  {!!appointment ? (
                    <CalendarCheck size={18} color="#6571FF" />
                  ) : (
                    <Calendar size={18} color="#66738C" />
                  )}
                </button>
              }
              vehicleId={vehicleId}
              clientId={clientId}
              onAppointmentCreated={(appointment: Appointment) =>
                onUpdateAppointment(appointment, {
                  leadId: lead.id,
                  columnId: lead.columnId!,
                })
              }
              onAppointmentUpdated={(appointment: Appointment) =>
                onUpdateAppointment(appointment, {
                  leadId: lead.id,
                  columnId: lead.columnId!,
                })
              }
            />
          )}

          {companyUsers &&
            (hasClient ? (
              <TaskForm
                companyUsers={companyUsers}
                leadId={lead.id}
                previousTasks={lead.tasks || []}
              />
            ) : (
              <span
                className={cn(
                  "relative inline-block h-4 w-4",
                  disabledActionClass,
                )}
              >
                <Image
                  src="/icons/addtask.png"
                  alt="Add Task"
                  fill
                  sizes="16px"
                  className="object-contain"
                  loading="lazy"
                />
              </span>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ResponsiveSalesPipelineCard;
