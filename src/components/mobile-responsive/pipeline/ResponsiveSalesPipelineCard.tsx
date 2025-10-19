import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import moment from "moment";
import { cn } from "@/lib/cn";

const ResponsiveSalesPipelineCard = ({
  lead,
  index,
}: {
  lead: any;
  index: number;
}) => {
  const id = lead?.id;
  const clientName =
    (lead.client?.firstName ?? "") + " " + (lead.client?.lastName ?? "");
  const clientEmail = lead.client?.email;
  const vehicle = lead?.vehicleInfo;
  const services = lead?.services?.split(",");
  const status = lead.column?.title;
  // console.log(lead);
  const timeCreated = moment(lead.createdAt).format("MM/DD/YYYY");

  const bgColor = lead.column?.bgColor!;
  const textColor = lead.column?.textColor!;

  const evenColor = "bg-background";
  const oddColor = "bg-[#EEF4FF]";

  return (
    <Card
      key={index}
      className={cn(
        "mt mb-4 rounded-[5px] border border-[#BFC4FF] text-[#66738C] shadow-sm",
        (index + 1) % 2 === 0 ? evenColor : oddColor
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
        <CardTitle>
          <Link href="#" passHref className="block w-full text-blue-600">
            {id}
          </Link>
        </CardTitle>
        <CardDescription className="font-bold">{timeCreated}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-xl font-bold">{clientName}</p>
        <p className="font-medium">{clientEmail}</p>
        <div className="mt-8 flex items-end justify-between">
          <div>
            <Link href="#">
              <p className="line-clamp-1">
                {vehicle.length > 20 ? vehicle.slice(0, 20) + "..." : vehicle}
              </p>
            </Link>
            <Link href="#">
              <p className="line-clamp-1">
                {services?.length > 0 &&
                  services?.map((s: string) =>
                    s.length > 20 ? s.slice(0, 20) + "..." : s
                  )}
              </p>
            </Link>
          </div>
          <p
            style={{
              backgroundColor: bgColor,
              color: textColor,
            }}
            className="rounded px-2 py-1 font-medium"
          >
            {status}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResponsiveSalesPipelineCard;
