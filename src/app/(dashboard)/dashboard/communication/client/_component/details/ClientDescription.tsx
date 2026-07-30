import { fetchMailsMailgun } from "@/actions/communication/client/fetchMailgunMails";
import getSms from "@/actions/communication/client/getSms";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Client } from "@prisma/client";
import ClientEstimates from "./ClientEstimates";
import SharedFilesSection from "./SharedFilesSection";
import TaskActions from "./TaskActions";
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

  const priorityStyles: Record<
    string,
    { background: string; borderLeft: string; color: string; boxShadow: string }
  > = {
    Low: {
      background: "linear-gradient(to right, #f5f3ff, #ede9fe)",
      borderLeft: "3px solid #6d28d9",
      color: "#6d28d9",
      boxShadow: "0 2px 8px rgba(109, 40, 217, 0.15)",
    },
    Medium: {
      background: "linear-gradient(to right, #f0f9ff, #e0f2fe)",
      borderLeft: "3px solid #0284c7",
      color: "#0284c7",
      boxShadow: "0 2px 8px rgba(2, 132, 199, 0.15)",
    },
    High: {
      background: "linear-gradient(to right, #b2f2bb, #d3f9d8)",
      borderLeft: "3px solid #22a7b8",
      color: "#22a7b8",
      boxShadow: "0 2px 8px rgba(34, 167, 184, 0.15)",
    },
  };

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

  const tasksNode = (
    <section className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm transition-colors dark:border-white/10 dark:bg-zinc-900/60">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
          Task List
        </h3>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
          {tasks?.length || 0}
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {tasks?.length ? (
          tasks.map((task) => {
            const style =
              priorityStyles[task.priority ?? "Low"] ?? priorityStyles.Low;
            return (
              <div
                key={task.id}
                className="group flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                style={style}
                title={task.title}
              >
                <span
                  className="truncate max-w-[12rem]"
                  style={{ color: style.color }}
                >
                  {task.title.length > 40
                    ? task.title.slice(0, 40) + "…"
                    : task.title}
                </span>
                <TaskActions task={task} color={style.color} />
              </div>
            );
          })
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            No tasks yet — add one below.
          </p>
        )}

        <div className="ml-auto">
          <TaskCreateOrEdit isClientTask={true} clientId={client.id} />
        </div>
      </div>
    </section>
  );

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
