"use client";

import {
  BellRing,
  CalendarDays,
  Car,
  Clock3,
  DollarSign,
  Mail,
  Phone,
  Tag,
  User,
  Users,
} from "lucide-react";
import moment from "moment";

type ReminderTime = { date: string; time: string };

interface AppointmentDetailCardProps {
  dateLabel?: string;
  timeRange: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  vehicle: string;
  invoiceGrandTotal?: number | null;
  serviceCategoryName?: string;
  assignedUsers?: any[];
  reminderTimes?: ReminderTime[] | null;
  aptIconClass: string;
  aptIconStyle?: React.CSSProperties;
}

function formatReminder({ date, time }: ReminderTime): string {
  const d = moment.utc(date);
  const dateStr = d.isValid() ? d.format("MMM D, YYYY") : date;
  const t = moment.utc(time, ["HH:mm", "HH:mm:ss"], true);
  const timeStr = t.isValid() ? t.format("h:mm A") : time;
  return `${dateStr} · ${timeStr}`;
}

export function AppointmentDetailCard({
  dateLabel,
  timeRange,
  clientName,
  clientEmail,
  clientPhone,
  vehicle,
  invoiceGrandTotal,
  serviceCategoryName,
  assignedUsers,
  reminderTimes,
  aptIconClass,
  aptIconStyle,
}: AppointmentDetailCardProps) {
  const details = [
    ...(dateLabel
      ? [
          {
            icon: <CalendarDays className="size-4" />,
            label: "Date",
            value: dateLabel,
          },
        ]
      : []),
    { icon: <Clock3 className="size-4" />, label: "Time", value: timeRange },
    { icon: <User className="size-4" />, label: "Client", value: clientName },
    { icon: <Mail className="size-4" />, label: "Email", value: clientEmail },
    { icon: <Phone className="size-4" />, label: "Phone", value: clientPhone },
    ...(vehicle
      ? [{ icon: <Car className="size-4" />, label: "Vehicle", value: vehicle }]
      : []),
  ];

  return (
    <>
      {details.map(({ icon, label, value }) => (
        <div key={label} className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${aptIconClass}`}
            style={aptIconStyle}
          >
            {icon}
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
              {label}
            </p>
            <p className="text-sm font-medium text-gray-900">{value}</p>
          </div>
        </div>
      ))}

      {invoiceGrandTotal != null && Number(invoiceGrandTotal) > 0 && (
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${aptIconClass}`}
            style={aptIconStyle}
          >
            <DollarSign className="size-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
              Estimate Price
            </p>
            <p className="text-sm font-semibold text-gray-900">
              ${Number(invoiceGrandTotal).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {serviceCategoryName && (
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${aptIconClass}`}
            style={aptIconStyle}
          >
            <Tag className="size-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
              Category
            </p>
            <p className="text-sm font-medium text-gray-900">
              {serviceCategoryName}
            </p>
          </div>
        </div>
      )}

      {assignedUsers && assignedUsers.length > 0 && (
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${aptIconClass}`}
            style={aptIconStyle}
          >
            <Users className="size-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
              Teammates
            </p>
            <p className="text-sm font-medium text-gray-900">
              {assignedUsers
                .map((u) =>
                  [u?.firstName, u?.lastName].filter(Boolean).join(" "),
                )
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        </div>
      )}

      {reminderTimes && reminderTimes.length > 0 && (
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${aptIconClass}`}
            style={aptIconStyle}
          >
            <BellRing className="size-4" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-0.5">
              Schedule Reminders
            </p>
            <div className="space-y-0.5">
              {reminderTimes.map((t, i) => (
                <p
                  key={`${t.date}-${t.time}-${i}`}
                  className="text-sm font-medium text-gray-900"
                >
                  {formatReminder(t)}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
