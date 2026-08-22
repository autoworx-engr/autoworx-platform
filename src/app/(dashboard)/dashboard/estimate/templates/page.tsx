import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { authOptions } from "@/authOptions";
import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { db } from "@/lib/db";
import { estimateTemplateFetchAndTransformData } from "@/lib/estimateTemplateFetchAndTransformData";
import { getServerSession } from "next-auth";
import Header from "../Header";
import NavigationTabs from "../NavigationTabs";
import TemplateTable from "./TemplateTable";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoices - Templates",
  description: "Manage and customize your invoice templates.",
};

async function TemplatesPage(
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

  const estimateTemplatesPromise = estimateTemplateFetchAndTransformData(
    companyId,
    searchParams,
    timezone,
  );
  if (!companyId) {
    throw new Error("Company ID is required to create an email template.");
  }

  const categoriesPromise = db.category.findMany({
    where: { companyId },
  });
  const tagsPromise = db.tag.findMany({
    where: { companyId, type: "GENERAL" },
  });
  const statusesPromise = db.column.findMany({
    where: { companyId, type: "shop" },
  });

  const [templates, categories, tags, statuses] = await Promise.all([
    estimateTemplatesPromise,
    categoriesPromise,
    tagsPromise,
    statusesPromise,
  ]);

  return (
    <div className="p-2 md:p-0">
      <Title>Templates</Title>

      <SyncLists categories={categories} tags={tags} statuses={statuses} />

      <Header
        searchTerm={searchParams.searchTerm}
        startDate={searchParams.startDate}
        endDate={searchParams.endDate}
        status={searchParams.status}
      />

      <NavigationTabs activeTab="d-template">
        <TemplateTable
          data={templates}
          page={searchParams.page}
          take={searchParams.take}
        />
      </NavigationTabs>
    </div>
  );
}

export default TemplatesPage;
