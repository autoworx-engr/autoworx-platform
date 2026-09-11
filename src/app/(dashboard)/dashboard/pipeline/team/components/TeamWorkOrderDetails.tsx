"use client";

import { cn } from "@/lib/cn";
import { getInvoiceItemTitle } from "@/utils/invoiceItemTitle";
import {
  CalendarDays,
  Car,
  CircleDollarSign,
  Layers,
  Mail,
  Phone,
  User,
} from "lucide-react";
import moment from "moment";

type DetailRow = { icon: React.ReactNode; label: string; value: string };

const formatDate = (value?: string | Date | null) => {
  if (!value) return null;
  const parsed = moment(value);
  return parsed.isValid() ? parsed.format("MMM D, YYYY") : null;
};

const statusClass = (status?: string | null) =>
  status?.toLowerCase().trim() === "complete"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
    : status
      ? "bg-amber-50 text-amber-700 ring-amber-100"
      : "bg-slate-50 text-slate-500 ring-slate-100";

const priorityClass = (priority?: string | null) =>
  priority === "High"
    ? "bg-red-50 text-red-700 ring-red-100"
    : priority === "Medium"
      ? "bg-amber-50 text-amber-700 ring-amber-100"
      : "bg-blue-50 text-blue-700 ring-blue-100";

function Chip({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1",
        className,
      )}
    >
      {children}
    </span>
  );
}

export default function TeamWorkOrderDetails({ data }: { data: any }) {
  const invoice = data?.invoice;
  if (!invoice) return null;

  const techniciansPerItem: Record<string, any[]> =
    data?.techniciansPerItem ?? {};
  const items = invoice.invoiceItems ?? [];

  const client = [invoice.client?.firstName, invoice.client?.lastName]
    .filter(Boolean)
    .join(" ");
  const vehicle = [
    invoice.vehicle?.year,
    invoice.vehicle?.make,
    invoice.vehicle?.model,
    invoice.vehicle?.other,
  ]
    .filter(Boolean)
    .join(" ");
  const dueDate = formatDate(invoice.dueDate);

  const rows: DetailRow[] = [
    ...(dueDate
      ? [
          {
            icon: <CalendarDays className="size-4" />,
            label: "Due Date",
            value: dueDate,
          },
        ]
      : []),
    ...(invoice.column?.title
      ? [
          {
            icon: <Layers className="size-4" />,
            label: "Stage",
            value: invoice.column.title,
          },
        ]
      : []),
    ...(client
      ? [{ icon: <User className="size-4" />, label: "Client", value: client }]
      : []),
    ...(invoice.client?.email
      ? [
          {
            icon: <Mail className="size-4" />,
            label: "Email",
            value: invoice.client.email,
          },
        ]
      : []),
    ...(invoice.client?.mobile
      ? [
          {
            icon: <Phone className="size-4" />,
            label: "Phone",
            value: invoice.client.mobile,
          },
        ]
      : []),
    ...(vehicle
      ? [{ icon: <Car className="size-4" />, label: "Vehicle", value: vehicle }]
      : []),
    {
      icon: <CircleDollarSign className="size-4" />,
      label: "Total / Due",
      value: `$${Number(invoice.grandTotal ?? 0).toFixed(2)} · $${Number(
        invoice.due ?? 0,
      ).toFixed(2)} due`,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {rows.map(({ icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
              {icon}
            </div>
            <div className="min-w-0">
              <p className="mb-0.5 text-xs font-medium uppercase tracking-wider text-gray-500">
                {label}
              </p>
              <p className="break-words text-sm font-medium text-gray-900">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
          Services, Materials & Labor
        </p>

        {items.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing added yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item: any) => {
              // Same rule as the work order modal: an item with no service is
              // still a valid labor-only or material-only row.
              if (!item.service && !item.labor && !item.materials?.length) {
                return null;
              }
              const technicians = techniciansPerItem[String(item.id)] ?? [];

              return (
                <li
                  key={item.id}
                  className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5"
                >
                  <p className="text-sm font-semibold capitalize text-slate-800">
                    {getInvoiceItemTitle(item)}
                  </p>

                  {item.materials?.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      <span className="font-semibold">Material:</span>{" "}
                      {item.materials
                        .map((material: any) => material.name)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}

                  {item.service && item.labor?.name && (
                    <p className="mt-1 text-xs text-slate-500">
                      <span className="font-semibold">Labor:</span>{" "}
                      {item.labor.name}
                    </p>
                  )}

                  {technicians.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {technicians.map((tech: any) => (
                        <div
                          key={tech.id}
                          className="flex flex-wrap items-center gap-1.5 text-xs"
                        >
                          <span className="font-medium text-slate-700">
                            {tech.name}
                          </span>
                          <Chip className={statusClass(tech.status)}>
                            {tech.status ?? "No status"}
                          </Chip>
                          <Chip className={priorityClass(tech.priority)}>
                            {tech.priority ?? "No priority"}
                          </Chip>
                          {tech.due && (
                            <span className="text-slate-400">
                              due {formatDate(tech.due)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
