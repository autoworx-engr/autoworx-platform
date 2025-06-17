import { fetchMailsMailgun } from "@/actions/communication/client/fetchMailgunMails";
import NewTask from "@/app/(dashboard)/dashboard/task/[type]/components/task/NewTask";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Client, Vehicle } from "@prisma/client";
import ClientEstimates from "./ClientEstimates";
import TaskActions from "./TaskActions";
import SaveAttachment from "./SaveAttachment";
import { planObject } from "@/utils/planObject";
import dynamic from "next/dynamic";
import getSms from "@/actions/communication/client/getSms";

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
  });

  const companyUsersPromise = db.user.findMany({
    where: {
      companyId,
    },
  });

  const smsPromise = getSms(client?.id);

  const [conversationsData, estimates, tasks, companyUsers, smsData] =
    await Promise.all([
      conversationsPromise,
      estimatesPromise,
      tasksPromise,
      companyUsersPromise,
      smsPromise,
    ]);

  const conversations = conversationsData.data;

  return (
    <div className="thin-scrollbar h-[60%] space-y-4 overflow-y-auto px-4 2xl:h-[60%]">
      {/* client notes */}
      <ClientNotes clientId={client.id} clientNotes={client?.notes || ""} />
      {/* shared files */}
      <div>
        <p>Shared Files</p>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          <p>Email :</p>
          {conversations &&
            conversations?.length > 0 &&
            conversations?.map((email) =>
              email.attachments.map((attachment) => (
                <SaveAttachment key={attachment.id} attachment={attachment} />
              )),
            )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-5">
          <p>SMS :</p>

          {smsData &&
            smsData?.length > 0 &&
            smsData?.map((sms) =>
              sms.attachments.map((attachment) => (
                <SaveAttachment key={attachment.id} attachment={attachment} />
              )),
            )}
        </div>
      </div>
      {/* estimate and invoices */}
      <div>
        <p>Estimate and Invoices</p>
        <ClientEstimates
          clientId={client.id}
          estimates={planObject(estimates)}
          vehicles={vehicles}
        />
      </div>
      {/* task */}
      {/* TODO: @bettercallsundim - complete this feature */}
      <div>
        <p>Task List</p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          {tasks?.length > 0 &&
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-x-4 rounded-full bg-[#6571FF] px-2 py-1 text-white"
              >
                <span>
                  {task.title.length > 20
                    ? task.title.slice(0, 20) + "..."
                    : task.title}
                </span>
                <TaskActions
                  usersOfCompany={planObject(companyUsers)}
                  task={task}
                />
              </div>
            ))}
          <div>
            <NewTask
              companyUsers={planObject(companyUsers)}
              isClientTask={true}
              clientId={client.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
