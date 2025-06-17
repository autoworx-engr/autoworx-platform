import { authOptions } from "@/authOptions";
import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { db } from "@/lib/db";
import { planObject } from "@/utils/planObject";
import { InvoiceType } from "@prisma/client";
import { getServerSession } from "next-auth";
import Header from "./Header";
import NavigationTabs from "./NavigationTabs";
import Table from "./Table";

async function fetchAndTransformData(
  type: InvoiceType,
  companyId: number,
  searchParams: { startDate?: string; endDate?: string; status?: string },
) {
  const { startDate, endDate, status } = searchParams;

  const data = await db.invoice.findMany({
    where: {
      type,
      companyId,
      createdAt: {
        gte: startDate ? new Date(`${startDate}T00:00:00`) : undefined,
        lte: endDate ? new Date(`${endDate}T23:59:59.999`) : undefined,
      },
      columnId: status ? parseInt(status) : undefined,
    },
  });

  return await Promise.all(
    data.map(async (item) => {
      const vehicle = item.vehicleId
        ? await db.vehicle.findFirst({
            where: { id: item.vehicleId },
          })
        : null;
      const client = item.clientId
        ? await db.client.findFirst({
            where: { id: item.clientId },
          })
        : null;
      const status = item.columnId
        ? await db.column.findFirst({
            where: { id: item.columnId },
          })
        : null;
      const clientName =
        `${client?.firstName ?? ""} ${client?.lastName ?? ""}`.trim();
      return {
        id: item.id,
        clientName: clientName || "",
        vehicle: vehicle
          ? `${vehicle.year?.toString().padStart(2, "0") ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`
          : "",
        email: client?.email || "",
        phone: client?.mobile || "",
        clientId: item.clientId,
        grandTotal: item.grandTotal as any,
        createdAt: item.createdAt,
        status: status?.title || "",
        textColor: status?.textColor || "",
        bgColor: status?.bgColor || "",
      };
    }),
  );
}

export default async function EstimatesPage({
  searchParams,
}: Readonly<{
  searchParams: { startDate?: string; endDate?: string; status?: string };
}>) {
const session = await getServerSession(authOptions);
    const companyId = session?.user.companyId;

    if (!companyId) {
      throw new Error("Company ID is required");
    }
  const estimates = await fetchAndTransformData(
    InvoiceType.Estimate,
    companyId,
    searchParams,
  );

  const categories = await db.category.findMany({ where: { companyId } });
  const tags = await db.tag.findMany({ where: { companyId } });
  const statuses = await db.column.findMany({ where: { companyId } });

  return (
    <div>
      <Title className="mt-2">Estimates</Title>

      <SyncLists categories={categories} tags={tags} statuses={statuses} />

      <Header />

      {/* Use the NavigationTabs component with the 'a-estimate' tab as active */}
      <NavigationTabs activeTab="a-estimate">
        <Table data={planObject(estimates)} />
      </NavigationTabs>
    </div>
  );
}
