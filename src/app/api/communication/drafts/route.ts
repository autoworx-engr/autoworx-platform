import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

const SECTIONS = ["client", "internal", "collaboration"] as const;
type Section = (typeof SECTIONS)[number];

// `channel` also disambiguates the `targetId` namespace for "internal"
// (a User.id for a 1:1 chat vs. a Group.id for a group chat) since both
// are plain integers and could otherwise collide.
const CHANNELS_BY_SECTION: Record<Section, string[]> = {
  client: ["sms", "email", "messenger", "instagram"],
  internal: ["dm", "group"],
  collaboration: [""],
};

function parseIdentity(params: {
  section: string | null;
  channel: string | null;
  targetId: string | null;
}) {
  const { section, channel, targetId } = params;

  if (!section || !SECTIONS.includes(section as Section)) {
    throw new AppError(400, "Invalid or missing 'section'");
  }

  const normalizedChannel = channel ?? "";
  if (!CHANNELS_BY_SECTION[section as Section].includes(normalizedChannel)) {
    throw new AppError(400, `Invalid 'channel' for section '${section}'`);
  }

  const targetIdNum = targetId ? parseInt(targetId, 10) : NaN;
  if (!Number.isFinite(targetIdNum)) {
    throw new AppError(400, "Invalid or missing 'targetId'");
  }

  return {
    section: section as Section,
    channel: normalizedChannel,
    targetId: targetIdNum,
  };
}

/**
 * @swagger
 * /api/communication/drafts:
 *   get:
 *     summary: Fetch the current user's saved draft for a conversation
 *     tags: [Communication Drafts]
 *     parameters:
 *       - in: query
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [client, internal, collaboration]
 *       - in: query
 *         name: channel
 *         required: false
 *         schema:
 *           type: string
 *         description: Required for "client" (sms|email|messenger|instagram) and "internal" (dm|group); omit for "collaboration"
 *       - in: query
 *         name: targetId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Draft retrieved (message is "" if none saved)
 */
export async function GET(request: NextRequest) {
  try {
    const principal = await getAuthPrincipal(request);
    if (!principal) throw new AppError(401, "Unauthorized");

    const searchParams = request.nextUrl.searchParams;
    const { section, channel, targetId } = parseIdentity({
      section: searchParams.get("section"),
      channel: searchParams.get("channel"),
      targetId: searchParams.get("targetId"),
    });

    const draft = await db.messageDraft.findUnique({
      where: {
        userId_section_channel_targetId: {
          userId: principal.userId,
          section,
          channel,
          targetId,
        },
      },
      select: { message: true, updatedAt: true },
    });

    return NextResponse.json({
      success: true,
      data: draft ?? { message: "", updatedAt: null },
    });
  } catch (error) {
    const errors = errorHandler(error);
    return NextResponse.json(
      { success: false, error: errors?.message || "Internal Server Error" },
      { status: errors?.statusCode || 500 },
    );
  }
}

/**
 * @swagger
 * /api/communication/drafts:
 *   put:
 *     summary: Upsert the current user's draft for a conversation; an empty message clears it
 *     tags: [Communication Drafts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [section, targetId, message]
 *             properties:
 *               section:
 *                 type: string
 *                 enum: [client, internal, collaboration]
 *               channel:
 *                 type: string
 *               targetId:
 *                 type: integer
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Draft saved, or cleared if message was empty
 */
export async function PUT(request: NextRequest) {
  try {
    const principal = await getAuthPrincipal(request);
    if (!principal) throw new AppError(401, "Unauthorized");

    const body = await request.json();
    const { section, channel, targetId } = parseIdentity({
      section: body?.section ?? null,
      channel: body?.channel ?? null,
      targetId: body?.targetId != null ? String(body.targetId) : null,
    });

    const message = typeof body?.message === "string" ? body.message : "";
    const identityWhere = {
      userId: principal.userId,
      section,
      channel,
      targetId,
    };

    if (message.trim().length === 0) {
      await db.messageDraft.deleteMany({ where: identityWhere });
      return NextResponse.json({ success: true, data: null });
    }

    const draft = await db.messageDraft.upsert({
      where: { userId_section_channel_targetId: identityWhere },
      create: { ...identityWhere, message },
      update: { message },
      select: { message: true, updatedAt: true },
    });

    return NextResponse.json({ success: true, data: draft });
  } catch (error) {
    const errors = errorHandler(error);
    return NextResponse.json(
      { success: false, error: errors?.message || "Internal Server Error" },
      { status: errors?.statusCode || 500 },
    );
  }
}
