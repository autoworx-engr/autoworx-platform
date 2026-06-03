import { fetchMailsMailgun } from "@/actions/communication/client/fetchMailgunMails";
import getSms from "@/actions/communication/client/getSms";
import TaskCreateOrEdit from "@/components/task/TaskCreateOrEdit";
import { cn } from "@/lib/cn";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Client, Vehicle } from "@prisma/client";
import ClientEstimates from "./ClientEstimates";
import SharedFilesSection from "./SharedFilesSection";
import TaskActions from "./TaskActions";
import {
  AppointmentListClient,
  ClientNotes,
} from "./ClientDescriptionDynamics";

type TProps = {
  client?: Client | null;
  vehicles?: Partial<Vehicle>[];
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

  const [
    conversationsData,
    estimates,
    estimatesCount,
    tasksData,
    companyUsers,
    smsData,
    appointmentData,
  ] = await Promise.all([
    conversationsPromise,
    estimatesPromise,
    estimatesCountPromise,
    tasksPromise,
    companyUsersPromise,
    smsPromise,
    appointmentsPromise,
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

  return (
    <div className="thin-scrollbar h-[60%] 2xl:h-[60%] overflow-y-auto px-4 space-y-6">
      {/* Client notes */}
      <section className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm transition-colors dark:border-white/10 dark:bg-zinc-900/60 mt-2">
        <ClientNotes clientId={client.id} clientNotes={client?.notes || ""} />
      </section>

      <SharedFilesSection
        emailAttachments={allEmailAttachments}
        smsAttachments={allSmsAttachments}
      />

      {/* Estimates & Invoices */}
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

      {/* Task list */}
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
            tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "group flex items-center gap-2 rounded-full border border-transparent  px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors",
                  {
                    "bg-[#6571FF]": task.priority === "Low",
                    "bg-[#25AADD]": task.priority === "Medium",
                    "bg-[#006d77]": task.priority === "High",
                  },
                )}
                title={task.title}
              >
                <span className="truncate max-w-[12rem]">
                  {task.title.length > 40
                    ? task.title.slice(0, 40) + "…"
                    : task.title}
                </span>
                <TaskActions task={task} />
              </div>
            ))
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

      {/* Appointments */}
      <AppointmentListClient appointments={appointmentData} />
    </div>
  );
}
