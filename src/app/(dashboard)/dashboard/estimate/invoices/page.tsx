import { authOptions } from "@/authOptions";
import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { db } from "@/lib/db";
import { fetchAndTransformData } from "@/lib/fetchAndTransformData";
import { InvoiceType } from "@prisma/client";
import { getServerSession } from "next-auth";
import Header from "../Header";
import NavigationTabs from "../NavigationTabs";
import Table from "../Table";

export default async function InvoicesPage({
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

  if (!companyId) {
    throw new Error("Company ID is required to create an email template.");
  }
  const invoices = await fetchAndTransformData(
    InvoiceType.Invoice,
    companyId,
    searchParams,
  );

  const categories = await db.category.findMany({ where: { companyId } });
  const tags = await db.tag.findMany({ where: { companyId, type: "GENERAL" } });
  const statuses = await db.column.findMany({ where: { companyId } });

 
  return (
    <div>
      <Title>Invoices</Title>

      <SyncLists categories={categories} tags={tags} statuses={statuses} />

      <Header
        searchTerm={searchParams.searchTerm}
        startDate={searchParams.startDate}
        endDate={searchParams.endDate}
      />

      <NavigationTabs activeTab="b-invoice">
        {invoices ? <Table estimateData={invoices} isInvoice /> : <div>Loading...</div>}
      </NavigationTabs>
    </div>
  );
}
