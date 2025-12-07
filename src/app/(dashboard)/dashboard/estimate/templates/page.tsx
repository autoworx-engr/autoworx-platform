import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import React from "react";
import Header from "../Header";
import NavigationTabs from "../NavigationTabs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { db } from "@/lib/db";
import TemplateTable from "./TemplateTable";
import { estimateTemplateFetchAndTransformData } from "@/lib/estimateTemplateFetchAndTransformData";

async function TemplatesPage({
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

  const estimateTemplatesPromise = estimateTemplateFetchAndTransformData(
    companyId,
    searchParams,
    timezone
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
    <div>
      <Title>Templates</Title>

      <SyncLists categories={categories} tags={tags} statuses={statuses} />

      <Header
        searchTerm={searchParams.searchTerm}
        startDate={searchParams.startDate}
        endDate={searchParams.endDate}
      />

      <NavigationTabs activeTab="d-template">
        <TemplateTable data={templates} />
      </NavigationTabs>
    </div>
  );
}

export default TemplatesPage;
