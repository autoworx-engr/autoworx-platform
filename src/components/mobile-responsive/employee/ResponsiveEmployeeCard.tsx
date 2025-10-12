import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { padId } from "@/lib/padId";
import { Calendar, Mail, MessageCircle, Phone } from "lucide-react";
import moment from "moment";
import Image from "next/image";
import Link from "next/link";

const ResponsiveEmployeeCard = ({
  data,
  index,
  isFleet = false,
}: {
  data: any;
  index: number;
  isFleet?: boolean;
}) => {
  const id = data.id;
  const clientName = (data.firstName ?? "") + " " + (data.lastName ?? "");
  const clientEmail = data.email;
  const clientPhone = data.phone || data.mobile;
  const clientImage = data.image;
  const role = data.role;
  // const joinDate =
  //   data.role === "admin"
  //     ? moment(data.createdAt).format("MM/DD/YYYY")
  //     : moment(data.joinDate).format("MM/DD/YYYY");

  const joinDate = moment(data?.joinDate).format("MM/DD/YYYY");

  const url =
    data.isFleet == true && isFleet == true
      ? `/dashboard/fleet/${id}`
      : data.role
        ? `/dashboard/employee/${id}?view=details`
        : `/dashboard/client/${id}`;

  const communicationUrl = data.role
    ? `/dashboard/communication/internal`
    : `/dashboard/communication/client/${id}`;

  const evenColor = "bg-background";
  const oddColor = "bg-[#EEF4FF]";

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden group mb-4">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Avatar */}

            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-white font-semibold text-base sm:text-lg flex-shrink-0`}
            >
              <Image
                src={clientImage}
                alt={clientName}
                width={56}
                height={56}
                className="rounded-xl"
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
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap bg-[#6571FF]/10 text-[#6571FF]`}
                >
                  {role}
                </span>
                <span className="text-xs sm:text-sm text-gray-400 hidden xs:inline">
                  •
                </span>
                <p className="flex items-center text-xs sm:text-sm text-gray-500 truncate">
                  ID:{" "}
                  <Link
                    href={url}
                    passHref
                    className="block w-full text-xs font-normal text-[#6571FF]"
                  >
                    {padId(id)}
                  </Link>
                </p>
              </div>

              {/* Contact Info */}
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <Mail className="w-4 h-4 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <a href={`mailto:${clientEmail}`} className="truncate">
                    {clientEmail}
                  </a>
                </div>
                {clientPhone && (
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <Phone className="w-4 h-4 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                    <a href={`tel:${clientPhone}`}>{clientPhone}</a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Icon */}
          <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0 ml-2">
            <Link href={communicationUrl}>
              <MessageCircle className="w-5 h-5 text-[#6571FF]" />
            </Link>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center pt-3 sm:pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-sm font-medium">
            <Calendar className="w-4 h-4 flex-shrink-0 text-gray-400" />
            <span className="truncate">Date Joined: {joinDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveEmployeeCard;
