import ConvertTo from "@/app/(dashboard)/dashboard/estimate/ConvertTo";
import { InvoiceData } from "@/app/(dashboard)/dashboard/estimate/Table";
import InvoiceModal from "@/components/invoice-modal/InvoiceModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { cn } from "@/lib/cn";
import { useActionStoreCreateEdit } from "@/stores/createEditStore";
import moment from "moment-timezone";
import Link from "next/link";

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

type TProps = {
  invoiceEstimate: InvoiceData;
  index: number;
  onConvert: () => void;
  autoOpen?: boolean;
};

export default function ResponsiveEstimateCard({
  invoiceEstimate,
  index,
  onConvert,
  autoOpen = false,
}: TProps) {
  const {
    id,
    clientName,
    clientId,
    vehicle,
    email,
    phone,
    grandTotal,
    createdAt,
    status,
    bgColor,
    textColor,
    isShopBooking,
  } = invoiceEstimate || {};
  const { setActionType } = useActionStoreCreateEdit();
  const timezone = useCompanyTimezone();

  return (
    <Card className={cn("w-full", index % 2 === 0 ? evenColor : oddColor)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {/* <Link
            href={`/dashboard/estimate/view/${id}`}
            passHref
            className="block w-full text-blue-600"
          >
            {id}
          </Link> */}

          <InvoiceModal
            invoiceId={id}
            buttonChild={<button className="text-blue-600">{id}</button>}
            autoOpen={autoOpen}
          />
          {isShopBooking && (
            <span className="mt-1 block text-center text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2 py-0.5 w-fit">
              Virtual Shop
            </span>
          )}
        </CardTitle>
        <CardDescription className="font-bold">
          {moment.tz(createdAt, timezone).format("MM/DD/YYYY")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* <Link href={`/dashboard/estimate/view/${id}`}> */}
        <InvoiceModal
          invoiceId={id}
          buttonChild={
            <>
              {/* Client Name and Grand Total Row */}
              <div className="flex items-center justify-between">
                <p className="line-clamp-1 text-xl font-bold">{clientName}</p>
                <p className="text-2xl text-blue-600">${grandTotal}</p>
              </div>

              {/* Vehicle and Status Row */}
              <div className="mt-1 flex items-center justify-between">
                <p className="line-clamp-1 text-xl text-blue-600">{vehicle}</p>
                <p
                  className="rounded-md px-1 text-left"
                  style={{
                    backgroundColor: bgColor,
                    color: textColor,
                  }}
                >
                  {status || ""}
                </p>
              </div>

              {/* Contact Info */}
              <div className="mt-3">
                <p className="text-sm text-gray-500">{email}</p>
                <p className="text-sm text-gray-500">{phone}</p>
              </div>
            </>
          }
        />
        {/* </Link> */}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">
          <ConvertTo onConvert={onConvert} />
        </Button>
        <Button variant="outline">
          <Link
            href={
              clientId != null
                ? `/dashboard/estimate/edit/${id}?clientId=${clientId}`
                : `/dashboard/estimate/edit/${id}`
            }
            className="text-xl text-blue-600"
            onClick={() => setActionType("edit")}
          >
            Edit
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
