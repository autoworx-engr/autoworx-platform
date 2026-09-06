import { fetchRecentMessages } from "@/actions/dashboard/technician/recentMessages";
import getUser from "@/lib/getUser";
import BoxTitle from "./BoxTitle";
import MessageContainer from "./MessageContainer";
import { cn } from "@/lib/cn"; // Ensure cn utility is imported
import { getClientMessages } from "@/actions/message/getClientMessages";
import { hasRouteAccess } from "@/lib/serverRouteGuard";
import BoxRestricted from "./BoxRestricted";
import { attachInternalSeenState } from "@/lib/messages/seenState";

/** Employee types this box appears for, and which message lists each may see. */
const CLIENT_MESSAGE_ROLES = ["Sales"];
const INTERNAL_MESSAGE_ROLES = ["Sales", "Technician", "Other"];

export default async function RecentMessagesBox() {
  const user = await getUser();

  // Each list is gated by its own Communications Hub module — the same keys the
  // /dashboard/communication routes use, so the box agrees with the pages it
  // links to. Checked before fetching, so a blocked list is never queried.
  const canSeeClientMessages =
    CLIENT_MESSAGE_ROLES.includes(user.employeeType) &&
    (await hasRouteAccess("/dashboard/communication/client"));

  const canSeeInternalMessages =
    INTERNAL_MESSAGE_ROLES.includes(user.employeeType) &&
    (await hasRouteAccess("/dashboard/communication/internal"));

  if (!canSeeClientMessages && !canSeeInternalMessages) {
    return (
      <BoxRestricted
        title="Recent Messages"
        what={
          CLIENT_MESSAGE_ROLES.includes(user.employeeType)
            ? "client & internal messages"
            : "internal messages"
        }
      />
    );
  }

  const clientData = canSeeClientMessages
    ? await getClientMessages(1)
    : { messages: [], total: 0, hasMore: false };

  const internalMessages = canSeeInternalMessages
    ? await attachInternalSeenState(await fetchRecentMessages(100), user.id)
    : [];

  // Point the header link at a list the user can actually open.
  const redirectLink = canSeeInternalMessages
    ? "/dashboard/communication/internal"
    : "/dashboard/communication/client";

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
          redirectLink={redirectLink}
        />

        {/* Message Container: Must fill remaining space and handle its own scrolling */}
        <div className="flex-1 min-h-0 custom-scrollbar overflow-y-auto">
          <MessageContainer
            user={user}
            initialClientMessages={clientData.messages}
            internalMessages={internalMessages}
            canSeeClientMessages={canSeeClientMessages}
          />
        </div>
      </div>
    </div>
  );
}
