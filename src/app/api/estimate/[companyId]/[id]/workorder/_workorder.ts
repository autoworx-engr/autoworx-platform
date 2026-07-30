import { db } from "@/lib/db";
import { AuthPrincipal } from "@/lib/getAuthPrincipal";
import { Technician, TechnicianImage, VehicleParts } from "@prisma/client";

type TechWithMeta = Technician & {
  name: string;
  hasPermission: boolean;
  vehicleParts: VehicleParts[];
  images: TechnicianImage[];
};

/**
 * Builds the full work order payload for an invoice, scoped to the caller's
 * company. Mirrors the web getWorkOrderData server action, but derives the
 * user from the JWT/session principal instead of getServerSession directly.
 * Returns null when the invoice is missing or not in the caller's company.
 */
export async function buildWorkOrderData(id: string, principal: AuthPrincipal) {
  const invoice = await db.invoice.findFirst({
    where: { id, companyId: principal.companyId },
    include: {
      company: true,
      invoiceItems: {
        include: { service: true, materials: true, labor: true },
      },
      photos: true,
      tasks: true,
      user: true,
      client: true,
      column: true,
      vehicle: true,
    },
  });

  if (!invoice) return null;

  const user = await db.user.findUnique({ where: { id: principal.userId } });
  const isAdminOrManager =
    user?.employeeType === "Admin" || user?.employeeType === "Manager";

  const allTechnicians = await db.technician.findMany({
    where: { invoiceId: invoice.id },
    include: { user: true, vehicleParts: true, images: true },
  });

  const techniciansPerItem: Record<number, TechWithMeta[]> = {};

  allTechnicians.forEach((tech) => {
    if (!tech.invoiceItemId) return;
    const hasPermission = user?.id === tech.userId || isAdminOrManager;
    const name = `${tech.user?.firstName || "Unknown"} ${tech.user?.lastName || ""}`;

    if (!techniciansPerItem[tech.invoiceItemId]) {
      techniciansPerItem[tech.invoiceItemId] = [];
    }
    techniciansPerItem[tech.invoiceItemId].push({
      ...tech,
      name,
      hasPermission,
    });
  });

  const redoRecords = await db.invoiceRedo.findMany({
    where: { invoiceId: invoice.id },
  });

  const redoPerService: Record<number, typeof redoRecords> = {};
  redoRecords.forEach((redo) => {
    if (!redoPerService[redo.serviceId]) redoPerService[redo.serviceId] = [];
    redoPerService[redo.serviceId].push(redo);
  });

  return {
    invoice,
    invoiceTechnicians: Object.values(techniciansPerItem).flat(),
    techniciansPerItem,
    redoPerService,
    company: invoice.company,
    writePermission: isAdminOrManager,
  };
}

/**
 * Sets dueDate, marks the invoice as a work order and stamps
 * workOrderCreatedAt once. Mirrors the updateDueDate server action.
 */
export async function saveWorkOrder(id: string, dueDate: string) {
  const invoice = await db.invoice.findUnique({ where: { id } });

  return db.invoice.update({
    where: { id },
    data: {
      dueDate,
      isWorkOrder: true,
      workOrderCreatedAt: invoice?.workOrderCreatedAt || new Date(),
    },
  });
}
