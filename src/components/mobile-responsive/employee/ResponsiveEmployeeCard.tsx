"use client";

import Avatar from "@/components/Avatar";
import { padId } from "@/lib/padId";
import { Calendar, Mail, Phone } from "lucide-react";
import moment from "moment";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

const ResponsiveEmployeeCard = ({
  data,
  index,
  isFleet = false,
  actions,
}: {
  data: any;
  index: number;
  isFleet?: boolean;
  actions?: ReactNode;
}) => {
  const id = data.id;
  const clientName = (data.firstName ?? "") + " " + (data.lastName ?? "");
  const clientEmail = data.email;
  const clientPhone = data.phone || data.mobile;
  const clientImage = data.image || data.photo || "/images/default.png";
  const role = data.role;
  // const joinDate =
  //   data.role === "admin"
  //     ? moment(data.createdAt).format("MM/DD/YYYY")
  //     : moment(data.joinDate).format("MM/DD/YYYY");

  const joinDate = moment(
    data?.joinDate ? data.joinDate : data.createdAt,
  ).format("MM/DD/YYYY");

  const url =
    data.isFleet == true && isFleet == true
      ? `/dashboard/fleet/${id}`
      : data.role
        ? `/dashboard/employee/${id}?view=details`
        : `/dashboard/client/${id}`;

  const communicationUrl = data.role
    ? `/dashboard/communication/internal?id=${id}`
    : `/dashboard/communication/client/${id}?chat=true`;

  const evenColor = "bg-background";
  const oddColor = "bg-[#EEF4FF]";

  const router = useRouter();

  return (
    <div
      key={index}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden group mb-4 cursor-pointer"
      onClick={() => router.push(url)}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Avatar */}

            <div className="flex-shrink-0">
              <Avatar
                photo={clientImage}
                width={56}
                height={56}
                className="w-12 h-12 sm:w-14 sm:h-14"
              />
            </div>

            {/* Employee Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate mb-1">
                {data.isFleet == true && isFleet == true
                  ? data?.fleet?.fleetName
                  : clientName}
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                {(data.employeeType || role) && (
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap bg-primary/10 text-primary`}
                  >
                    {data.employeeType || role}
                  </span>
                )}
                <span className="text-xs sm:text-sm text-gray-400 hidden xs:inline">
                  •
                </span>
                <p className="flex items-center text-xs sm:text-sm text-gray-500 truncate">
                  ID:{" "}
                  <span className="block w-full text-xs font-normal text-primary ml-1">
                    {padId(id)}
                  </span>
                </p>
              </div>

              {/* Contact Info */}
              <div className="space-y-1.5">
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center space-x-2 text-sm font-medium"
                >
                  <Mail className="w-4 h-4 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <a href={`mailto:${clientEmail}`} className="truncate">
                    {clientEmail}
                  </a>
                </div>
                {clientPhone && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center space-x-2 text-sm font-medium"
                  >
                    <Phone className="w-4 h-4 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                    <a href={`tel:${clientPhone}`}>{clientPhone}</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-sm font-medium">
            <Calendar className="w-4 h-4 flex-shrink-0 text-gray-400" />
            <span className="truncate">Date Joined: {joinDate}</span>
          </div>
          {actions && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-4"
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveEmployeeCard;
