import { ClientChatHub } from "@/components/crm/client-chat-hub";
import { CrmPageHeader } from "@/components/crm/page-header";
import { db } from "@/lib/db";
import { activeAccountWhere, activeContactWhere } from "@/lib/crm-scope";
import { requireSession } from "@/lib/require-session";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Client Chat" };

export default async function ClientChatPage() {
  const session = await requireSession();
  const companyId = session.user.companyId;

  const [accounts, contacts] = await Promise.all([
    db.crmAccount.findMany({
      where: { companyId, ...activeAccountWhere },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.contact.findMany({
      where: { companyId, ...activeContactWhere },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
      take: 300,
    }),
  ]);

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <CrmPageHeader
        title="Client Chat"
        description="Chat directly with clients. Each conversation generates a unique portal link — share it so clients can reply without any account."
      />
      <ClientChatHub
        accounts={accounts}
        contacts={contacts}
        pusherKey={process.env.NEXT_PUBLIC_PUSHER_KEY!}
        pusherCluster={process.env.NEXT_PUBLIC_PUSHER_CLUSTER!}
        siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}
      />
    </div>
  );
}
