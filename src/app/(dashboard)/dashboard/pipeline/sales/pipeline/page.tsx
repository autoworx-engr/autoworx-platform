import SalesPipelineSection from "./_components/SalesPipelineSection";
import SearchSection from "./_components/SearchSection";
import OrderSelect from "./_components/FilterLead";
import { ColumnProvider } from "@/context/sales-pipeline.context";

import { cookies } from "next/headers";

type TProps = {
  searchParams: {
    searchTerm?: string;
    orderBy?: "asc" | "desc" | undefined;
  };
};

export default async function SalesPipelinePage({ searchParams }: TProps) {
  const orderBy = searchParams.orderBy;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000";
  const params = new URLSearchParams();
  if (searchParams?.searchTerm)
    params.append("searchTerm", searchParams.searchTerm);
  params.append("initialLoad", "true");
  if (orderBy) params.append("orderBy", orderBy);

  const cookieStore = cookies();
  const cookiesString = cookieStore
    .getAll()
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const res = await fetch(
    `${baseUrl}/api/pipeline/sales/pipeline?${params.toString()}`,
    {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookiesString,
      },
    },
  );

  let pipelineColumns = [];
  if (res.ok) {
    const parsed = await res.json();
    console.log({ parsed });
    if (parsed.success) {
      pipelineColumns = parsed.data;
    }
  }

  return (
    <div className="space-y-8">
      <div className="mb-4 px-2 flex items-center gap-2">
        <SearchSection searchValue={searchParams.searchTerm} />
        <OrderSelect searchParams={searchParams} />
      </div>
      <ColumnProvider
        initialColumns={pipelineColumns}
        companyUsers={[]}
        searchTerm={searchParams.searchTerm}
        orderBy={orderBy}
      >
        <SalesPipelineSection />
      </ColumnProvider>
    </div>
  );
}
