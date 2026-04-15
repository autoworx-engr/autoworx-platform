import Link from "next/link";
import React from "react";
import FleetDetails from "../components/FleetDetails";
import InvoiceAndStatementList from "../components/InvoiceAndStatementList";
import NewFleet from "@/app/(dashboard)/dashboard/fleet/components/NewFleet";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { ArrowLeft } from "lucide-react";

type PropsType = {
  params: Promise<{
    id?: string;
  }>;
  searchParams: Promise<{
    search?: string;
  }>;
};

const info = {
  jobsCount: 567,
  customerLifetimeValue: 567,
  paidInvoiceCount: 567,
  unpaidInvoiceCount: 567,
};

const page = async (props: PropsType) => {
  const params = await props.params;
  const searchParams = await props.searchParams;
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
      <div className="flex items-center justify-between mb-1">
        <h1 className="mr-4 mt-1 text-xl font-bold text-slate-600 sm:text-2xl">
          Fleet Details
        </h1>

        {/* Add new fleet button */}

        <NewFleet
          buttonElement={
            <button className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#6571FF] to-[#8088FF] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-[#6571FF]/40 transition-all duration-300 hover:from-[#505aff] hover:to-[#6571FF] hover:shadow-xl">
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
