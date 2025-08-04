import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { padId } from "@/lib/padId";
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
  const role = data.role;
  // const joinDate =
  //   data.role === "admin"
  //     ? moment(data.createdAt).format("MM/DD/YYYY")
  //     : moment(data.joinDate).format("MM/DD/YYYY");

  const joinDate = moment(data?.createdAt).format("MM/DD/YYYY");

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
    <Card
      key={index}
      className={cn(
        "mb-4 rounded-[5px] border border-[#BFC4FF] text-[#66738C] shadow-sm",
        (index + 1) % 2 === 0 ? evenColor : oddColor,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between p-4 pb-0">
        <CardTitle>
          <Link
            href={url}
            passHref
            className="block w-full text-xs font-normal text-[#6571FF]"
          >
            {padId(id)}
          </Link>
          <p className="text-xl font-bold">
            {data.isFleet == true && isFleet == true
              ? data?.fleet?.fleetName
              : clientName}
          </p>
          <div></div>
          <p className="font-bold text-[#6571FF]">{role}</p>
        </CardTitle>
        {(data.joinDate || data.createdAt) && (
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase">date joined</span>
            <span className="font-normal">{joinDate}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div>
              <a
                href={`mailto:${clientEmail}`}
                className="line-clamp-1 text-blue-500 hover:text-blue-700"
              >
                {clientEmail}
              </a>
            </div>
            <div>
              <a
                href={`tel:${clientPhone}`}
                className="line-clamp-1 text-blue-500 hover:text-blue-700"
              >
                {clientPhone}
              </a>
            </div>
          </div>
          <Link href={communicationUrl}>
            <Image
              src="/icons/communication.jpg"
              alt="communication"
              width={27}
              height={18}
            />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResponsiveEmployeeCard;
