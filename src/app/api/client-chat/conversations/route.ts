import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { activeAccountWhere, activeContactWhere } from "@/lib/crm-scope";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const companyId = Number(session.user.companyId);

  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId") ? Number(searchParams.get("accountId")) : null;

  const conversations = await db.clientConversation.findMany({
    where: { companyId, ...(accountId ? { accountId } : {}) },
    include: {
      account: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(conversations);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const companyId = Number(session.user.companyId);

  const body = (await req.json()) as {
    accountId?: number;
    contactId?: number;
    title?: string;
  };

  if (!body.accountId) return new NextResponse("accountId required", { status: 400 });

  const account = await db.crmAccount.findFirst({
    where: { id: body.accountId, companyId, ...activeAccountWhere },
  });
  if (!account) return new NextResponse("Account not found", { status: 404 });

  if (body.contactId) {
    const contact = await db.contact.findFirst({
      where: { id: body.contactId, companyId, ...activeContactWhere },
    });
    if (!contact) return new NextResponse("Contact not found", { status: 404 });
  }

  const token = randomBytes(24).toString("hex");

  const conversation = await db.clientConversation.create({
    data: {
      companyId,
      accountId: body.accountId,
      contactId: body.contactId ?? null,
      token,
      title: body.title?.trim() || `Chat with ${account.name}`,
    },
    include: {
      account: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json(conversation);
}
