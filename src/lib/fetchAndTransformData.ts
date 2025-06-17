import { db } from "@/lib/db";
import { InvoiceType } from "@prisma/client";

export async function fetchAndTransformData(
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
    include: {
      vehicle: true,
      client: true,
      column: true,
    },
  });

  return data.map((item) => {
    const clientName =
      `${item.client?.firstName ?? ""} ${item.client?.lastName ?? ""}`.trim();
    const grandTotalNumber = item.grandTotal ? Number(item.grandTotal) : 0;
    return {
      id: item.id,
      clientName: clientName || "",
      vehicle: item.vehicle
        ? `${item.vehicle.year ?? ""} ${item.vehicle.make ?? ""} ${item.vehicle.model ?? ""}`
        : "",
      email: item.client?.email || "",
      phone: item.client?.mobile || "",
      clientId: item.clientId,
      grandTotal: grandTotalNumber,
      createdAt: item.createdAt,
      status: item.column?.title || "",
      textColor: item.column?.textColor || "",
      bgColor: item.column?.bgColor || "",
    };
  });
}
