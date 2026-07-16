import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import WorkOrderModal from "@/components/workorder-modal/WorkOrderModal";
import { cn } from "@/lib/cn";
import moment from "moment";

const ResponsiveShopPipelineCard = ({
  invoice,
  index,
}: {
  invoice: any;
  index: number;
}) => {
  const id = invoice?.id;
  const client =
    (invoice.client?.firstName ?? "") + " " + (invoice.client?.lastName ?? "");
  const vehicle = `${invoice.vehicle?.year || ""} ${invoice.vehicle?.make ?? ""} ${invoice.vehicle?.model ?? ""} ${invoice.vehicle?.other ?? ""}`;
  const serviceString = invoice?.invoiceItems
    ?.map((item: any) => item.service?.name)
    .join(", ");
  // TODO: this hasn't been tested properly. Need to test it.
  const timeCreated = moment(invoice?.workOrderCreatedAt).format("MM/DD/YYYY");
  const dueDate = invoice?.dueDate
    ? moment(invoice.dueDate).format("MM/DD/YYYY")
    : null;
  const bgColor = invoice.column?.bgColor!;
  const textColor = invoice.column?.textColor!;

  const evenColor = "bg-background";
  const oddColor = "bg-[#EEF4FF]";
  return (
    <Card
      key={index}
      className={cn(
        "mb-4 h-36 rounded-[5px] border border-[#BFC4FF] px-3 py-2 text-[#66738C] shadow-sm",
        (index + 1) % 2 === 0 ? evenColor : oddColor,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between p-0">
        <CardTitle>
          <WorkOrderModal
            invoiceId={id}
            buttonChild={<button className="text-primary">{id}</button>}
          />
        </CardTitle>
        <CardDescription className="font-bold">{timeCreated}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <p className="text-xl font-bold">{client}</p>
        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="line-clamp-1">
              {vehicle.length > 20 ? vehicle.slice(0, 20) + "..." : vehicle}
            </p>
            <p className="line-clamp-1">
              {serviceString.length > 20
                ? serviceString.slice(0, 20) + "..."
                : serviceString}
            </p>
          </div>
          <p
            style={{
              backgroundColor: bgColor,
              color: textColor,
            }}
            className="rounded px-2 py-1 font-medium"
          >
            {invoice.column?.title}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResponsiveShopPipelineCard;
