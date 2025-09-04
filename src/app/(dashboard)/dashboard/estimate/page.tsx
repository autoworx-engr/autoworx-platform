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
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";

export default async function EstimatesPage({
  searchParams,
}: Readonly<{
  searchParams: {
    startDate?: string;
    endDate?: string;
    status?: string;
    searchTerm?: string;
    page?: string;
    take?: string;
  };
}>) {
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
    timezone
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
    <div>
      <Title>Estimates</Title>

      <SyncLists categories={categories} tags={tags} statuses={statuses} />

      <Header
        searchTerm={searchParams.searchTerm}
        startDate={searchParams.startDate}
        endDate={searchParams.endDate}
        status={searchParams.status}
      />

      {/* Use the NavigationTabs component with the 'a-estimate' tab as active */}
      <NavigationTabs activeTab="a-estimate">
        <Table estimateData={estimates} />
      </NavigationTabs>
    </div>
  );
}
