import { fetchRecentMessages } from "@/actions/dashboard/technician/recentMessages";
import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import getPermissions from "@/lib/getPermissions";
import BoxTitle from "./BoxTitle";
import MessageContainer from "./MessageContainer";
import { cn } from "@/lib/cn"; // Ensure cn utility is imported
import { getClientMessages } from "@/actions/message/getClientMessages";

export default async function RecentMessagesBox() {
  const user = await getUser();

  // Get permissions to check communicationHubInternal
  const permissions = await getPermissions();
  const companyPermissions = permissions?.companyPermissions;
  const userPermissions = permissions?.userPermissions;

  // Priority-based permission check: userPermission first, then companyPermission
  const hasMessagePermission =
    permissions?.role === "Admin" ||
    (userPermissions?.communicationHubInternal !== undefined
      ? userPermissions.communicationHubInternal
      : companyPermissions?.communicationHubInternal !== false);

  // Hide redirect link if company permission is false (regardless of user permission)
  const shouldHideRedirectLink =
    permissions?.role !== "Admin" &&
    companyPermissions?.communicationHubInternal === false;

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
            a.MailgunEmail[a.MailgunEmail.length - 1].createdAt,
          ).getTime()
        : new Date("1970-01-01").getTime();

    const bLastEmailDate =
      b.MailgunEmail.length > 0
        ? new Date(
            b.MailgunEmail[b.MailgunEmail.length - 1].createdAt,
          ).getTime()
        : new Date("1970-01-01").getTime();

    return bLastEmailDate - aLastEmailDate;
  });

  const clientData =
    user.employeeType === "Sales"
      ? await getClientMessages(1)
      : { messages: [], total: 0, hasMore: false };
  const defaultTake = 100; // Default number of messages to fetch

  const internalMessages = await fetchRecentMessages(defaultTake);

  return (
    // Outer Container: Apply full Glassmorphism style and ensure flex-1 stretching
    <div
      className={cn(
        `
          flex flex-1 flex-col p-4 md:p-6 rounded-2xl transition-all duration-300 #h-full

          // Glassmorphism aesthetic (Replaces old p-6 shadow-md)
          bg-white/50 dark:bg-slate-900/50
          backdrop-blur-md

          // Subtle border and lift
          ring-1 ring-slate-900/5 dark:ring-white/10
          shadow-lg dark:shadow-2xl dark:shadow-blue-900/20

          // Hover effect for interactivity
          hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-indigo-500/10

          overflow-hidden // Crucial for containing the scrollable MessageContainer
        `,
      )}
    >
      <div className="flex flex-col h-full">
        <BoxTitle
          className="mb-4 md:mb-6 flex-shrink-0" // Add margin and ensure title doesn't scroll
          title="Recent Messages"
          redirectLink={
            !shouldHideRedirectLink
              ? "/dashboard/communication/internal"
              : undefined
          }
        />

        {/* Message Container: Must fill remaining space and handle its own scrolling */}
        <div className="flex-1 min-h-0 custom-scrollbar overflow-y-auto">
          <MessageContainer
            user={user}
            hasMessagePermission={hasMessagePermission}
            // Only Sales gets client emails on the dashboard (as per existing logic)
            // clientMessages={user.employeeType === "Sales" ? sortedClients : []}
            initialClientMessages={clientData.messages} // Already sorted
            // Technicians get internal messages
            internalMessages={
              user.employeeType === "Technician" ||
              user.employeeType === "Sales" ||
              user.employeeType === "Other"
                ? internalMessages
                : []
            }
          />
        </div>
      </div>
    </div>
  );
}
