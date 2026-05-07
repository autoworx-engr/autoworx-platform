import { ClientPortal } from "@/components/portal/client-portal";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const conv = await db.clientConversation.findUnique({
    where: { token },
    include: { account: { select: { name: true } } },
  });
  return { title: conv ? `Chat — ${conv.account.name}` : "Chat" };
}

export default async function PortalPage({ params }: Props) {
  const { token } = await params;

  const conv = await db.clientConversation.findUnique({
    where: { token },
    include: {
      account: { select: { id: true, name: true } },
      contact: { select: { firstName: true, lastName: true } },
    },
  });

  if (!conv) notFound();

  const defaultName =
    conv.contact
      ? `${conv.contact.firstName} ${conv.contact.lastName ?? ""}`.trim()
      : conv.account.name;

  return (
    <ClientPortal
      token={conv.token}
      title={conv.title ?? `Chat with ${conv.account.name}`}
      accountName={conv.account.name}
      defaultSenderName={defaultName}
      pusherKey={process.env.NEXT_PUBLIC_PUSHER_KEY!}
      pusherCluster={process.env.NEXT_PUBLIC_PUSHER_CLUSTER!}
    />
  );
}
