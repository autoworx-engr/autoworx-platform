import { CrmPageHeader } from "@/components/crm/page-header";
import { MessagesHub } from "@/components/crm/messages-hub";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { Metadata } from "next";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const session = await requireSession();
  const companyId = session.user.companyId;
  const myId = Number(session.user.id);

  const teammates = await db.user.findMany({
    where: { companyId, id: { not: myId } },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <CrmPageHeader
        title="Messages"
        description="Real-time team chat and browser-based voice calls — no phone number needed."
      />
      <MessagesHub
        myId={myId}
        myName={session.user.name ?? "Me"}
        companyId={companyId}
        teammates={teammates.map((t) => ({
          id: t.id,
          name: `${t.firstName} ${t.lastName ?? ""}`.trim(),
          email: t.email,
        }))}
        pusherKey={process.env.NEXT_PUBLIC_PUSHER_KEY!}
        pusherCluster={process.env.NEXT_PUBLIC_PUSHER_CLUSTER!}
      />
    </div>
  );
}
