import { fetchRecentMessages } from "@/actions/dashboard/technician/recentMessages";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import BoxTitle from "./BoxTitle";
import MessageContainer from "./MessageContainer";

export default async function RecentMessagesBox() {
  const user = await getUser();
  const clients = await db.client.findMany({
    where: { companyId: user.companyId },
    include: {
      MailgunEmail: {
        orderBy: {
          createdAt: "desc", // Assuming createdAt is the timestamp for the email
        },
        take: 1,
        include: {
          client: true,
        }, // Get only the latest email for each client
      },
    },
  });

  // Now, sort clients manually based on the latest MailgunEmail
  const sortedClients = clients.sort((a, b) => {
    const aLastEmailDate =
      a.MailgunEmail.length > 0
        ? new Date(
            a.MailgunEmail[a.MailgunEmail.length - 1].createdAt
          ).getTime()
        : new Date("1970-01-01").getTime();

    const bLastEmailDate =
      b.MailgunEmail.length > 0
        ? new Date(
            b.MailgunEmail[b.MailgunEmail.length - 1].createdAt
          ).getTime()
        : new Date("1970-01-01").getTime();

    return bLastEmailDate - aLastEmailDate;
  });

  const defaultTake = 100; // Default number of messages to fetch

  const internalMessages = await fetchRecentMessages(defaultTake);

  return (
    <div className="flex-1 overflow-y-hidden p-6 shadow-md">
      <div className="h-full">
        <BoxTitle
          className="mb-4"
          title="Recent Messages"
          redirectLink="/dashboard/communication/internal"
        />
        <MessageContainer
          user={user}
          clientMessages={user.employeeType === "Sales" ? sortedClients : []}
          internalMessages={
            user.employeeType === "Technician" || user.employeeType === "Other"
              ? internalMessages
              : []
          }
        />
      </div>
    </div>
  );
}
