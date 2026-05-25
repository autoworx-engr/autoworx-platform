import { fetchMailsMailgun } from "@/actions/communication/client/fetchMailgunMails";
import getSms from "@/actions/communication/client/getSms";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Client, Vehicle, VehicleColor } from "@prisma/client";
import ClientEstimates from "./ClientEstimates";
import SharedFilesSection from "./SharedFilesSection";
import {
  AppointmentListClient,
  ClientNotes,
  TaskListSection,
  VehicleDetails,
} from "./ClientDescriptionDynamics";

type TProps = {
  client?: Client | null;
  vehicles?: Array<Partial<Vehicle> & { color?: VehicleColor | null }>;
};

export default async function ClientDescription({
  client,
  vehicles = [],
}: TProps) {
  if (!client) return null;
  const companyId = await getCompanyId();

  const leadPromise = client.leadId
    ? db.lead.findUnique({
        where: { id: client.leadId },
        select: { isLead: true, services: true },
      })
    : Promise.resolve(null);

  const conversationsPromise = fetchMailsMailgun(client.id);

  const invoicesPromise = db.invoice.findMany({
    where: { clientId: client.id },
    include: {
      invoiceItems: { include: { service: true } },
      vehicle: true,
      status: true,
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  const estimatesCountPromise = db.invoice.count({
    where: { clientId: client?.id },
  });

  const smsPromise = getSms(client.id);

  const tasksPromise = db.task.findMany({
    where: {
      companyId,
      OR: [{ clientId: client.id }, { leadId: client.id }],
    },
    include: { taskUser: { include: { user: true } } },
  });

  const appointmentsPromise = db.appointment.findMany({
    where: { companyId, clientId: client.id },
  });

  const [
    lead,
    conversationsData,
    invoices,
    estimatesCount,
    smsData,
    tasksData,
    appointments,
  ] = await Promise.all([
    leadPromise,
    conversationsPromise,
    invoicesPromise,
    estimatesCountPromise,
    smsPromise,
    tasksPromise,
    appointmentsPromise,
  ]);

  const tasks = tasksData.map((t) => ({
    ...t,
    assignedUsers: t.taskUser.map((tu) => tu.user),
  }));

  const conversations = conversationsData.data;
  const allEmailAttachments =
    conversations?.flatMap((e) =>
      e.attachments.map((a) => ({ ...a, createdAt: e.createdAt })),
    ) ?? [];
  const allSmsAttachments = smsData?.flatMap((s) => s.attachments) ?? [];

  const vehicleIds = vehicles.map((v) => v.id!).filter(Boolean);

  const estimates = invoices.map((inv) => {
    const firstService = inv.invoiceItems.find((it) => it.service)?.service;
    return {
      id: inv.id,
      type: inv.type,
      grandTotal: Number(inv.grandTotal ?? 0),
      statusId: inv.statusId,
      createdAt: inv.createdAt,
      title: firstService?.name ?? null,
      statusName: inv.status?.name ?? null,
    };
  });

  return (
    <div className="thin-scrollbar flex-1 space-y-3 overflow-y-auto bg-zinc-50/40 px-3 py-3 dark:bg-zinc-950/40">
      <VehicleDetails
        vehicles={vehicles}
        isLeadClient={!!lead?.isLead}
        invoices={invoices}
        singleService={lead?.services ?? ""}
      />

      <section className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-900/60">
        <ClientNotes clientId={client.id} clientNotes={client.notes ?? ""} />
      </section>

      <SharedFilesSection
        emailAttachments={allEmailAttachments}
        smsAttachments={allSmsAttachments}
      />

      <ClientEstimates
        clientId={client.id}
        estimates={estimates}
        vehicleIds={vehicleIds}
        totalCount={estimatesCount}
      />

      <TaskListSection clientId={client.id} tasks={tasks} />

      <AppointmentListClient appointments={appointments} />
    </div>
  );
}
