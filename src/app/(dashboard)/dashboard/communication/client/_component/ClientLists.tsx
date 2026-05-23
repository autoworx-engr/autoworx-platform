import { getCompanyId } from "@/lib/companyId";
import { getClients } from "../_actions/getClients";
import ClientFilter from "./ClientFilter";
import ClientInfinityScroll from "./ClientInfinityScroll";

const defaultTakeData = 20;

export default async function ClientLists() {
  const companyId = await getCompanyId();
  const clientsFromApi = await getClients({
    companyId,
    take: defaultTakeData,
  });

  const clients = [...clientsFromApi];

  const unreadCount = clients.reduce((acc, c) => {
    const t = c.conversationsTrack;
    if (!t) return acc;
    const has = !t.smsIsRead || !t.emailIsRead || !t.messengerIsRead;
    return acc + (has ? 1 : 0);
  }, 0);

  return (
    <div
      style={{ overflowAnchor: "none" }}
      className="app-shadow mt-3 flex h-[90vh] flex-col overflow-hidden rounded-lg border border-zinc-200/70 bg-background p-3 dark:border-white/10 lg:mt-0 lg:block"
      id="client-message-lists"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight text-zinc-800 dark:text-zinc-100">
          Inbox
        </h2>
        {unreadCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#006D77]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#006D77] dark:bg-[#006D77]/20 dark:text-[#4dd2dc]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#006D77]" />
            {unreadCount} new
          </span>
        )}
      </div>

      <ClientFilter />

      <ClientInfinityScroll
        defaultTakeData={defaultTakeData}
        clients={clients}
        companyId={companyId}
      />
    </div>
  );
}
