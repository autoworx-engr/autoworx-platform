import { fetchMailsMailgun } from "@/actions/communication/client/fetchMailgunMails";
import getSms from "@/actions/communication/client/getSms";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Client } from "@prisma/client";
import ClientEstimates from "./ClientEstimates";
import SharedFilesSection from "./SharedFilesSection";
import TaskListClient from "./TaskListClient";
import ClientDetailsTabs from "./ClientDetailsTabs";
import { VehicleDetails } from "./ClientHeadingDynamics";
import type { ClientVehicle } from "./VehicleDetails";
import {
  AppointmentListClient,
  ClientNotes,
} from "./ClientDescriptionDynamics";

type TProps = {
  client?: Client | null;
  vehicles?: ClientVehicle[];
};

export default async function ClientDescription({ client, vehicles }: TProps) {
  if (!client) return null;
  const companyId = await getCompanyId();
  const conversationsPromise = fetchMailsMailgun(client?.id);

  const estimatesPromise = db.invoice.findMany({
    where: { clientId: client?.id },
    select: {
      id: true,
      type: true,
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  const estimatesCountPromise = db.invoice.count({
    where: { clientId: client?.id },
  });

  const tasksPromise = db.task.findMany({
    where: {
      companyId,
      status: "pending",
      OR: [
        {
          clientId: client?.id,
        },
        {
          leadId: client?.id,
        },
      ],
    },
    include: {
      taskUser: {
        include: {
          user: true,
        },
      },
    },
  });

  const appointmentsPromise = db.appointment.findMany({
    where: {
      companyId,
      clientId: client?.id,
    },
  });

  const companyUsersPromise = db.user.findMany({
    where: {
      companyId,
    },
  });

  const smsPromise = getSms(client?.id);

  const messengerPromise = db.messengerMessage.findMany({
    where: { clientId: client.id },
    select: {
      attachments: {
        select: { id: true, name: true, url: true, createdAt: true },
      },
    },
  });

  const instagramPromise = db.instagramMessage.findMany({
    where: { clientId: client.id },
    select: {
      createdAt: true,
      attachments: { select: { id: true, name: true, url: true } },
    },
  });

  const leadPromise = client.leadId
    ? db.lead.findUnique({
        where: { id: client.leadId },
        select: { isLead: true, services: true },
      })
    : Promise.resolve(null);

  const vehicleInvoicesPromise = db.invoice.findMany({
    where: { clientId: client.id },
    include: {
      invoiceItems: { include: { service: true } },
      vehicle: true,
    },
  });

  const [
    conversationsData,
    estimates,
    estimatesCount,
    tasksData,
    companyUsers,
    smsData,
    appointmentData,
    messengerData,
    instagramData,
    lead,
    vehicleInvoices,
  ] = await Promise.all([
    conversationsPromise,
    estimatesPromise,
    estimatesCountPromise,
    tasksPromise,
    companyUsersPromise,
    smsPromise,
    appointmentsPromise,
    messengerPromise,
    instagramPromise,
    leadPromise,
    vehicleInvoicesPromise,
  ]);

  // Transform tasks to include assignedUsers in the correct format
  const tasks = tasksData.map((task) => ({
    ...task,
    assignedUsers: task.taskUser.map((tu) => tu.user),
  }));

  const conversations = conversationsData.data;

  const allEmailAttachments =
    conversations?.flatMap((e) =>
      e.attachments.map((a) => ({ ...a, createdAt: e.createdAt })),
    ) ?? [];

  const allSmsAttachments = smsData?.flatMap((s) => s.attachments) ?? [];

  const allMessengerAttachments = messengerData.flatMap((m) => m.attachments);
  const allInstagramAttachments = instagramData.flatMap((m) =>
    m.attachments.map((a) => ({ ...a, createdAt: m.createdAt })),
  );

  const vehicleNode = (
    <VehicleDetails
      isLeadClient={!!lead?.isLead}
      vehicles={vehicles ?? []}
      invoices={vehicleInvoices}
      singleService={lead?.services ?? ""}
    />
  );

  const notesNode = (
    <section className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm transition-colors dark:border-white/10 dark:bg-zinc-900/60">
      <ClientNotes clientId={client.id} clientNotes={client?.notes || ""} />
    </section>
  );

  const filesNode = (
    <SharedFilesSection
      emailAttachments={allEmailAttachments}
      smsAttachments={allSmsAttachments}
      messengerAttachments={allMessengerAttachments}
      instagramAttachments={allInstagramAttachments}
    />
  );

  const estimatesNode = (
    <section className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm transition-colors dark:border-white/10 dark:bg-zinc-900/60">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
          Estimates & Invoices
        </h3>
      </header>
      <ClientEstimates
        clientId={client.id}
        estimates={estimates}
        vehicles={vehicles}
        totalCount={estimatesCount}
      />
    </section>
  );

  const tasksNode = <TaskListClient tasks={tasks} clientId={client.id} />;

  const appointmentsNode = (
    <AppointmentListClient
      appointments={appointmentData}
      companyId={companyId}
      clientId={client.id}
    />
  );

  return (
    <ClientDetailsTabs
      vehicle={vehicleNode}
      notes={notesNode}
      files={filesNode}
      estimates={estimatesNode}
      tasks={tasksNode}
      appointments={appointmentsNode}
      counts={{
        vehicle: vehicles?.length ?? 0,
        files:
          allEmailAttachments.length +
          allSmsAttachments.length +
          allMessengerAttachments.length +
          allInstagramAttachments.length,
        estimates: estimatesCount,
        tasks: tasks?.length || 0,
        appointments: appointmentData?.length || 0,
      }}
    />
  );
}
