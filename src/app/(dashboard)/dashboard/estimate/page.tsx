import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { authOptions } from "@/authOptions";
import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { db } from "@/lib/db";
import { fetchAndTransformData } from "@/lib/fetchAndTransformData";
import { InvoiceType } from "@prisma/client";
import { getServerSession } from "next-auth";
import Header from "./Header";
import NavigationTabs from "./NavigationTabs";
import Table from "./Table";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoices - Estimates",
  description: "View and manage all your estimates.",
};

export default async function EstimatesPage(
  props: Readonly<{
    searchParams: Promise<{
      startDate?: string;
      endDate?: string;
      status?: string;
      searchTerm?: string;
      page?: string;
      take?: string;
    }>;
  }>,
) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  const companyId = session?.user.companyId;
  const { timezone } = await getCompanyTimezone();
  if (!companyId) {
    throw new Error("Company ID is required");
  }
  const estimatesPromise = fetchAndTransformData(
    InvoiceType.Estimate,
    companyId,
    searchParams,
    timezone,
  );

  const categoriesPromise = db.category.findMany({
    where: { companyId },
  });
  const tagsPromise = db.tag.findMany({
    where: { companyId, type: "GENERAL" },
  });
  const statusesPromise = db.column.findMany({
    where: { companyId, type: "shop" },
  });

  const [estimates, categories, tags, statuses] = await Promise.all([
    estimatesPromise,
    categoriesPromise,
    tagsPromise,
    statusesPromise,
  ]);

  return (
    <div className="p-2 md:p-0">
      <Title>Estimates</Title>

      <SyncLists categories={categories} tags={tags} statuses={statuses} />

      <div className="w-full">
        <Header
          searchTerm={searchParams.searchTerm}
          startDate={searchParams.startDate}
          endDate={searchParams.endDate}
          status={searchParams.status}
        />
      </div>

      {/* Use the NavigationTabs component with the 'a-estimate' tab as active */}
      <NavigationTabs activeTab="a-estimate">
        <Table
          estimateData={estimates}
          page={searchParams.page}
          take={searchParams.take}
        />
      </NavigationTabs>
    </div>
  );
}
