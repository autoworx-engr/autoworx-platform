import React from "react";
import Avatar from "@/components/Avatar";
import InputDetails from "./InputDetails";
import FleetStatistics from "./FleetStatistics";
import FleetSubHeading from "./FleetSubHeading";
import NewFleet from "./NewFleet";
import { IoMdSettings } from "react-icons/io";
import { Client, Fleet, Invoice, Tag } from "@prisma/client";
import ResponsiveEmployeeCard from "@/components/mobile-responsive/employee/ResponsiveEmployeeCard";
import Image from "next/image";

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
        <div className="absolute right-2 top-1">
          {/* <EditClient client={client} settingIcon /> */}
          <NewFleet
            fleet={client}
            buttonElement={<IoMdSettings />}
            isEdit={true}
          />
        </div>
        <ResponsiveEmployeeCard data={client} index={0} />
      </div>
      <div className="clients-center relative hidden flex-[0.4] rounded border border-gray-300 bg-background p-3 pt-10 lg:flex lg:gap-3">
        <div className="absolute left-2 top-1 cursor-pointer">
          <NewFleet
            fleet={client}
            buttonElement={<IoMdSettings />}
            isEdit={true}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="clients-center mr-3 flex flex-col">
            <Avatar photo={client.photo} width={150} height={150} />
          </div>

          <div className="flex h-6 gap-2 text-xs font-bold">
            {client?.tag && (
              <div
                style={{ backgroundColor: client?.tag?.bgColor }}
                className="px-2 py-1"
              >
                {client?.tag?.name}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 text-sm">
          <InputDetails label="Fleet Name" value={client?.fleet?.fleetName} />
          <InputDetails
            label="Name of Contact"
            value={client.fleet?.contactName}
          />
          <InputDetails label="Phone" value={client.mobile!} />
          <InputDetails label="Address" value={client?.address!} />
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
