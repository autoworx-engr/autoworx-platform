import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import {
  isAudio,
  isImage,
} from "@/app/(dashboard)/dashboard/communication/client/_utils";

type AttachmentType =
  | "email"
  | "sms"
  | "messenger"
  | "instagram"
  | "docs"
  | "audio";

const ATTACHMENT_TYPES: AttachmentType[] = [
  "email",
  "sms",
  "messenger",
  "instagram",
  "docs",
  "audio",
];

type NormalizedAttachment = {
  id: number;
  name: string | null;
  url: string;
  createdAt: Date;
};

async function fetchAllChannelAttachments(
  clientId: number,
): Promise<NormalizedAttachment[]> {
  const [emailRows, smsRows, messengerRows, instagramRows] = await Promise.all([
    db.mailgunEmailAttachment.findMany({
      where: { mailgunEmail: { clientId } },
      include: { mailgunEmail: { select: { createdAt: true } } },
    }),
    db.clientSmsAttachments.findMany({
      where: { clientSMS: { clientId } },
      select: { id: true, name: true, url: true, createdAt: true },
    }),
    db.messengerAttachment.findMany({
      where: { messengerMessage: { clientId } },
      select: { id: true, name: true, url: true, createdAt: true },
    }),
    db.instagramMessageAttachment.findMany({
      where: { message: { clientId } },
      include: { message: { select: { createdAt: true } } },
    }),
  ]);

  return [
    ...emailRows.map((r) => ({
      id: r.id,
      name: r.name,
      url: r.url,
      createdAt: r.mailgunEmail.createdAt,
    })),
    ...smsRows,
    ...messengerRows,
    ...instagramRows.map((r) => ({
      id: r.id,
      name: r.name,
      url: r.url,
      createdAt: r.message.createdAt,
    })),
  ];
}

/**
 * @swagger
 * /api/client/client-details/{id}/files:
 *   get:
 *     summary: Get client's shared file attachments (paginated)
 *     description: Retrieve paginated attachments shared with a client through a specific communication channel.
 *     tags: [Clients]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Client ID
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [email, sms, messenger, instagram, docs, audio]
 *         description: Attachment source/channel
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Client files fetched successfully
 *       400:
 *         description: Invalid client ID or attachment type
 *       500:
 *         description: Failed to fetch client files
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
  if (jwtCompanyId === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await props.params;
  try {
    const clientId = parseInt(params.id);
    if (isNaN(clientId)) {
      return NextResponse.json(
        { success: false, message: "Invalid client ID" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as AttachmentType | null;

    if (!type || !ATTACHMENT_TYPES.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          message: `Invalid attachment type. Must be one of: ${ATTACHMENT_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "10") || 10,
      100,
    );
    const skip = (page - 1) * limit;

    let data: NormalizedAttachment[] = [];
    let total = 0;

    switch (type) {
      case "email": {
        const where = { mailgunEmail: { clientId } };
        [data, total] = await Promise.all([
          db.mailgunEmailAttachment
            .findMany({
              where,
              include: { mailgunEmail: { select: { createdAt: true } } },
              orderBy: { id: "desc" },
              skip,
              take: limit,
            })
            .then((rows) =>
              rows.map((r) => ({
                id: r.id,
                name: r.name,
                url: r.url,
                createdAt: r.mailgunEmail.createdAt,
              })),
            ),
          db.mailgunEmailAttachment.count({ where }),
        ]);
        break;
      }
      case "sms": {
        const where = { clientSMS: { clientId } };
        [data, total] = await Promise.all([
          db.clientSmsAttachments.findMany({
            where,
            select: { id: true, name: true, url: true, createdAt: true },
            orderBy: { id: "desc" },
            skip,
            take: limit,
          }),
          db.clientSmsAttachments.count({ where }),
        ]);
        break;
      }
      case "messenger": {
        const where = { messengerMessage: { clientId } };
        [data, total] = await Promise.all([
          db.messengerAttachment.findMany({
            where,
            select: { id: true, name: true, url: true, createdAt: true },
            orderBy: { id: "desc" },
            skip,
            take: limit,
          }),
          db.messengerAttachment.count({ where }),
        ]);
        break;
      }
      case "instagram": {
        const where = { message: { clientId } };
        [data, total] = await Promise.all([
          db.instagramMessageAttachment
            .findMany({
              where,
              include: { message: { select: { createdAt: true } } },
              orderBy: { id: "desc" },
              skip,
              take: limit,
            })
            .then((rows) =>
              rows.map((r) => ({
                id: r.id,
                name: r.name,
                url: r.url,
                createdAt: r.message.createdAt,
              })),
            ),
          db.instagramMessageAttachment.count({ where }),
        ]);
        break;
      }
      case "docs":
      case "audio": {
        const all = await fetchAllChannelAttachments(clientId);
        const filtered = all
          .filter((a) =>
            type === "audio"
              ? isAudio(a.name ?? "")
              : !isImage(a.name ?? "") && !isAudio(a.name ?? ""),
          )
          .sort((a, b) => b.id - a.id);
        total = filtered.length;
        data = filtered.slice(skip, skip + limit);
        break;
      }
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + data.length < total,
      },
    });
  } catch (error) {
    console.error("CLIENT FILES FETCH ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch client files" },
      { status: 500 },
    );
  }
}
