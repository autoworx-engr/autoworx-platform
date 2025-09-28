import { fetchRecentMessages } from "@/actions/dashboard/technician/recentMessages";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import getPermissions from "@/lib/getPermissions";
import BoxTitle from "./BoxTitle";
import MessageContainer from "./MessageContainer";

export default async function RecentMessagesBox() {
  const user = await getUser();

  // Get permissions to check communicationHubInternal
  const permissions = await getPermissions();
  const companyPermissions = permissions?.companyPermissions;
  const userPermissions = permissions?.userPermissions;

  console.log(
    "permissions company",
    companyPermissions,
    "permissions Users",
    permissions?.userPermissions
  );

  // Priority-based permission check: userPermission first, then companyPermission
  const hasMessagePermission =
    permissions?.role === "Admin" ||
    (userPermissions?.communicationHubInternal !== undefined
      ? userPermissions.communicationHubInternal
      : companyPermissions?.communicationHubInternal !== false);

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
          redirectLink={
            hasMessagePermission
              ? "/dashboard/communication/internal"
              : undefined
          }
        />
        <MessageContainer
          user={user}
          hasMessagePermission={hasMessagePermission}
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
