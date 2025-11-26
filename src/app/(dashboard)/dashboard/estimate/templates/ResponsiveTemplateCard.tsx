import ConvertTo from "@/app/(dashboard)/dashboard/estimate/ConvertTo";
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
import { TemplateData } from "./TemplateTable";

const evenColor = "bg-background";
const oddColor = "bg-[#F8FAFF]";

type TProps = {
  template: TemplateData;
  index: number;
};

export default function ResponsiveTemplateCard({ template, index }: TProps) {
  const { id, grandTotal, createdAt, status, bgColor, textColor, title } =
    template || {};
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
          />
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
                <p className="line-clamp-1 text-xl font-bold">{title}</p>
                <p className="text-2xl text-blue-600">${grandTotal}</p>
              </div>
            </>
          }
        />
        {/* </Link> */}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button className="bg-background">
          <Link
            href={`/dashboard/estimate/templates/edit/${id}`}
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
