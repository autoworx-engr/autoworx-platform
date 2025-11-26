import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import React from "react";
import Header from "../Header";
import NavigationTabs from "../NavigationTabs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/authOptions";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { fetchAndTransformData } from "@/lib/fetchAndTransformData";
import { db } from "@/lib/db";
import TemplateTable from "./TemplateTable";

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
    throw new Error("Company ID is required to create an email template.");
  }

  const categories = await db.category.findMany({ where: { companyId } });
  const tags = await db.tag.findMany({ where: { companyId, type: "GENERAL" } });
  const statuses = await db.column.findMany({ where: { companyId } });

  return (
    <div>
      <Title>Templates</Title>

      <SyncLists categories={categories} tags={tags} statuses={statuses} />

      <Header
        searchTerm={searchParams.searchTerm}
        startDate={searchParams.startDate}
        endDate={searchParams.endDate}
      />

      <NavigationTabs activeTab="c-template">
        <TemplateTable data={{ data: [], totalEstimate: 0 }} />
      </NavigationTabs>
    </div>
  );
}

export default TemplatesPage;
