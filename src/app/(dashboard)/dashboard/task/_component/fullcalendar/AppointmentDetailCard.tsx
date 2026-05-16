"use client";

import {
  CalendarDays,
  Clock3,
  User,
  Mail,
  Phone,
  Car,
  DollarSign,
  Tag,
  Users,
} from "lucide-react";

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
  aptIconClass: string;
  aptIconStyle?: React.CSSProperties;
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
              Technicians
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
    </>
  );
}
