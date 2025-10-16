import Link from "next/link";
import React from "react";
import FleetDetails from "../components/FleetDetails";
import InvoiceAndStatementList from "../components/InvoiceAndStatementList";
import NewFleet from "@/app/(dashboard)/dashboard/fleet/components/NewFleet";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ArrowLeft } from "lucide-react";

type PropsType = {
  params: {
    id?: string;
  };
  searchParams: {
    search?: string;
  };
};

const info = {
  jobsCount: 567,
  customerLifetimeValue: 567,
  paidInvoiceCount: 567,
  unpaidInvoiceCount: 567,
};

const page = async (props: PropsType) => {
  const { params, searchParams } = props;
  const { id } = params;

  const companyId = await getCompanyId();
  const client = await db.client.findUnique({
    where: { id: Number(id), companyId, isFleet: true, NOT: { fleet: null } },
    include: {
      fleet: true,
      Invoice: {
        where: {
          type: "Invoice",
        },
        include: {
          column: true,
          vehicle: true,
        },
      },
      tag: {
        where: { type: "CLIENT" },
      },
    },
  });

  return (
    <div className="p-2">
      <div className="w-fit rounded border p-1.5 md:hidden">
        <Link href="/dashboard/fleet">
          <ArrowLeft size={18} />
        </Link>
      </div>
      <div className="flex items-center justify-between">
        <h1 className="mr-4 mt-1 text-xl font-bold text-[#797979] sm:text-2xl">
          Fleet List
        </h1>

        {/* Add new fleet button */}

        <NewFleet
          buttonElement={
            <button className="w-fit self-end rounded-md bg-[#6571FF] p-2 px-5 text-white">
              + Add New Fleet
            </button>
          }
        />
      </div>
      {/* Fleet Details */}
      <FleetDetails fleet={client} info={info} />

      {/* Invoice and Statement */}
      <InvoiceAndStatementList client={client} searchParams={searchParams} />
    </div>
  );
};

export default page;
