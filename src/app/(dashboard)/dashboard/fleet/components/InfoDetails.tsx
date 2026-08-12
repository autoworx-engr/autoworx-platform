import Avatar from "@/components/Avatar";
import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import { Client, Fleet, Invoice, Tag } from "@prisma/client";
import { PencilLineIcon } from "lucide-react";
import FleetStatistics from "./FleetStatistics";
import FleetSubHeading from "./FleetSubHeading";
import NewFleet from "./NewFleet";

const DataField = ({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) => (
  <div className="flex items-start py-2">
    <label className="block w-24 shrink-0 text-sm font-medium text-slate-500 lg:w-28">
      {label}
    </label>
    <div className="flex-1 text-sm font-semibold text-slate-600 leading-relaxed">
      {value || (
        <span className="text-slate-600 ">
          {label === "Address" ? "No Address Listed" : "N/A"}
        </span>
      )}
    </div>
  </div>
);

const InfoDetails = ({
  client,
}: {
  client: Client & {
    fleet: Fleet | null;
    Invoice: Invoice[];
    tag: Tag | null;
  };
}) => {
  const unpaidInvoices = client?.Invoice?.filter(
    (invoice: any) =>
      invoice?.grandTotal == 0 || (invoice?.grandTotal > 0 && invoice?.due > 0),
  );

  const paidInvoices = client?.Invoice?.filter(
    (invoice: any) => invoice?.grandTotal > 0 && invoice?.due == 0,
  );

  const totalValue = client.Invoice?.reduce(
    (sum, invoice: Invoice) => sum + Number(invoice?.grandTotal || 0),
    0,
  );

  return (
    <div className="flex w-full flex-col justify-between gap-3 lg:flex-row lg:gap-5">
      <div className="relative lg:hidden">
        <div className="absolute right-2 top-2">
          <NewFleet
            fleet={client}
            buttonElement={<PencilLineIcon size={14} color="#6571ff" />}
            isEdit={true}
          />
        </div>
        <ResponsiveEmployeeCard data={client} index={0} />
      </div>

      {/* Desktop Card */}
      <div className="hidden flex-[0.4] lg:block">
        <div className="relative rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-900/5 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10">
          {/* Action Buttons (Top Right) */}
          <div className="absolute right-4 top-4">
            <div className="flex items-center gap-2">
              <div className="absolute right-4 top-4 cursor-pointer">
                <NewFleet
                  fleet={client}
                  buttonElement={<PencilLineIcon size={16} color="#6571ff" />}
                  isEdit={true}
                />
              </div>
            </div>
          </div>

          {/* Profile and Details */}
          <div className="flex w-full flex-col items-center gap-6 pt-6 lg:flex-row lg:items-start lg:pt-0">
            <div className="shrink-0">
              <Avatar photo={client.photo} width={150} height={150} />
            </div>

            <div className="w-full divide-y divide-slate-100 lg:w-3/5">
              <DataField label="Fleet Name" value={client?.fleet?.fleetName} />
              <DataField label="Contact" value={client?.fleet?.contactName} />
              <DataField label="Phone" value={client.mobile || ""} />
              <DataField label="Address" value={client.address || ""} />
            </div>
          </div>

          {/* Tags / Source */}
          <div className="mt-6 flex items-center gap-x-4 border-t border-slate-100 pt-4">
            {client.tag && (
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider shadow-md"
                style={{
                  backgroundColor: client.tag.bgColor,
                  color: client.tag.textColor,
                }}
              >
                {client.tag.name}
              </span>
            )}
          </div>
        </div>
      </div>
      {/* <div className="relative lg:hidden">
        <div className="absolute right-2 top-1">
          <Edclientployee employee={employee} settingIcon />
        </div>
        <ResponsiveEmployeeCard data={employee} index={0} />
      </div>

      {employee.employeeType !== "Sales" ? (
        <Payout info={info} />
      ) : (
        <PayoutSales employee={employee} timezone={timezone} />
      )} */}
      {/* Fleet Statistics */}
      <div className="flex-[0.6]">
        <FleetSubHeading text=" Fleet Statistics" />

        <FleetStatistics
          paid={paidInvoices?.length}
          totalInvoice={client.Invoice?.length}
          unpaid={unpaidInvoices?.length}
          totalValue={totalValue}
        />
      </div>
    </div>
  );
};

export default InfoDetails;
