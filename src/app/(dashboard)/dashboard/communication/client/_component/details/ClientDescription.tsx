import { fetchMailsMailgun } from "@/actions/communication/client/fetchMailgunMails";
import NewTask from "@/app/(dashboard)/dashboard/task-v1/[type]/components/task/NewTask";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Client, Vehicle } from "@prisma/client";
import ClientEstimates from "./ClientEstimates";
import TaskActions from "./TaskActions";
import SaveAttachment from "./SaveAttachment";
import dynamic from "next/dynamic";
import getSms from "@/actions/communication/client/getSms";
import { cn } from "@/lib/cn";
import Link from "next/link";
const AppointmentListClient = dynamic(() => import("./AppointmentListClient"), {
  ssr: false,
});
type TProps = {
  client?: Client | null;
  vehicles?: Partial<Vehicle>[];
};

const ClientNotes = dynamic(() => import("./ClientNotes"), { ssr: false });

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
    tasksData,
    companyUsers,
    smsData,
    appointmentData,
  ] = await Promise.all([
    conversationsPromise,
    estimatesPromise,
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

  return (
    <div className="thin-scrollbar h-[60%] 2xl:h-[60%] overflow-y-auto px-4 space-y-6">
      {/* Client notes */}
      <section className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm transition-colors dark:border-white/10 dark:bg-zinc-900/60 mt-2">
        <ClientNotes clientId={client.id} clientNotes={client?.notes || ""} />
      </section>

      {/* Shared files */}
      <section className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm transition-colors dark:border-white/10 dark:bg-zinc-900/60">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
            Shared Files
          </h3>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
            {(conversations?.flatMap((e) => e.attachments).length || 0) +
              (smsData?.flatMap((s) => s.attachments).length || 0)}
          </span>
        </header>

        {/* Email attachments */}
        <div className="mt-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Email
            </p>
            <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
              {conversations?.flatMap((e) => e.attachments).length || 0}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            {conversations && conversations.length > 0 ? (
              conversations.map((email) =>
                email.attachments.map((attachment) => (
                  <SaveAttachment key={attachment.id} attachment={attachment} />
                ))
              )
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No files shared via email yet.
              </p>
            )}
          </div>
        </div>

        {/* SMS attachments */}
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              SMS
            </p>
            <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
              {smsData?.flatMap((s) => s.attachments).length || 0}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            {smsData && smsData.length > 0 ? (
              smsData.map((sms) =>
                sms.attachments.map((attachment) => (
                  <SaveAttachment key={attachment.id} attachment={attachment} />
                ))
              )
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No files shared via SMS yet.
              </p>
            )}
          </div>
        </div>
      </section>

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
                  }
                )}
                title={task.title}
              >
                <span className="truncate max-w-[12rem]">
                  {task.title.length > 40
                    ? task.title.slice(0, 40) + "…"
                    : task.title}
                </span>
                <TaskActions usersOfCompany={companyUsers} task={task} />
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              No tasks yet — add one below.
            </p>
          )}

          <div className="ml-auto">
            <NewTask
              companyUsers={companyUsers}
              isClientTask={true}
              clientId={client.id}
            />
          </div>
        </div>
      </section>

      {/* Appointments */}
      <AppointmentListClient appointments={appointmentData} />
    </div>
  );
}
