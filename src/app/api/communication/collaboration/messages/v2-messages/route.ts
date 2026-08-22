import { AppError } from "@/error-boundary/error";
import { db } from "@/lib/db";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { revalidatePath } from "next/cache";
import { getPusherInstance } from "@/lib/pusher/server";

/**
 * @swagger
 * /api/communication/collaboration/messages/v2-messages:
 *   get:
 *     summary: Get collaboration messages between two companies
 *     description: Returns all collaboration messages between companyA and companyB, including attachments, sender info, and request estimates. Adds a UI flag `isOwnMessage` based on the viewer company.
 *     tags:
 *       - Collaboration
 *     parameters:
 *       - in: query
 *         name: companyA
 *         required: true
 *         description: First company ID in the conversation
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: companyB
 *         required: true
 *         description: Second company ID in the conversation
 *         schema:
 *           type: integer
 *           example: 5
 *       - in: query
 *         name: viewerCompanyId
 *         required: true
 *         description: Company ID of the viewer (used to determine message ownership)
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Collaboration messages fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 101
 *                       message:
 *                         type: string
 *                         example: "Please check the estimate attached."
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2026-03-13T10:30:00.000Z
 *                       fromCompanyId:
 *                         type: integer
 *                         example: 1
 *                       toCompanyId:
 *                         type: integer
 *                         example: 5
 *                       isOwnMessage:
 *                         type: boolean
 *                         example: true
 *                       attachments:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 55
 *                             fileName:
 *                               type: string
 *                               example: estimate.pdf
 *                             fileType:
 *                               type: string
 *                               example: application/pdf
 *                             fileUrl:
 *                               type: string
 *                               example: https://cdn.domain.com/files/estimate.pdf
 *                             fileSize:
 *                               type: string
 *                               example: 1.5 MB
 *                       senderUser:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 10
 *                           firstName:
 *                             type: string
 *                             example: John
 *                           lastName:
 *                             type: string
 *                             example: Doe
 *                           image:
 *                             type: string
 *                             example: /images/default.png
 *                       requestEstimate:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 20
 *                           invoice:
 *                             type: object
 *                             nullable: true
 *       400:
 *         description: Missing required company IDs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Missing required company IDs
 *       500:
 *         description: Server error while fetching messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */

const pusher = getPusherInstance();

export async function GET(req: Request) {
  try {
    const callerCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (!callerCompanyId) {
      throw new AppError(401, "Unauthorized");
    }

    const { searchParams } = new URL(req.url);

    const companyA = parseInt(searchParams.get("companyA") || "");
    const companyB = parseInt(searchParams.get("companyB") || "");
    const viewerCompanyId = parseInt(searchParams.get("viewerCompanyId") || "");

    if (!companyA || !companyB || !viewerCompanyId) {
      throw new AppError(400, "Missing required company IDs");
    }

    // Viewer must be the authenticated caller's company AND a participant
    if (viewerCompanyId !== callerCompanyId) {
      throw new AppError(403, "viewerCompanyId does not match your session");
    }
    if (companyA !== callerCompanyId && companyB !== callerCompanyId) {
      throw new AppError(403, "You are not a participant in this conversation");
    }

    const take = Math.min(parseInt(searchParams.get("take") || "20"), 100);
    const skip = Math.max(parseInt(searchParams.get("skip") || "0"), 0);

    const where = {
      section: "collaboration",
      OR: [
        { fromCompanyId: companyA, toCompanyId: companyB },
        { fromCompanyId: companyB, toCompanyId: companyA },
      ],
    };

    const [messages, total] = await Promise.all([
      db.collaborationMessage.findMany({
        where,
        include: {
          attachment: true,
          senderUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              image: true,
            },
          },
          requestEstimate: {
            include: { invoice: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      db.collaborationMessage.count({ where }),
    ]);

    // Only mark INBOUND messages as read on the first page load (skip === 0).
    // Older-page loads must not retrigger the read receipt.
    const otherCompanyId = viewerCompanyId === companyA ? companyB : companyA;
    if (skip === 0) {
      const readMessages = await db.companyChatTrack.updateMany({
        where: {
          senderCompanyId: otherCompanyId,
          receiverCompanyId: viewerCompanyId,
          isRead: false,
        },
        data: { isRead: true },
      });

      if (readMessages.count > 0) {
        try {
          await pusher.trigger(`company-track-${otherCompanyId}`, "chat-read", {
            senderCompanyId: otherCompanyId,
            receiverCompanyId: viewerCompanyId,
          });
        } catch {
          // Pusher trigger failure is non-fatal
        }
      }
    }

    /* ---------------- ADD UI FLAGS ---------------- */

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      message: msg.message,
      createdAt: msg.createdAt,
      attachments: msg.attachment,
      requestEstimate: msg?.requestEstimate,
      senderUser: msg.senderUser,
      fromCompanyId: msg.fromCompanyId,
      toCompanyId: msg.toCompanyId,
      isOwnMessage: msg.fromCompanyId === viewerCompanyId,
    }));

    if (skip === 0) {
      revalidatePath("/dashboard/communication/collaboration");
    }

    return new Response(
      JSON.stringify({
        success: true,
        messages: formattedMessages,
        meta: {
          total,
          skip,
          take,
          hasMore: skip + messages.length < total,
        },
      }),
      { status: 200 },
    );
  } catch (e) {
    const formattedError = errorHandler(e);

    return new Response(
      JSON.stringify({
        success: false,
        message: formattedError?.message,
      }),
      { status: formattedError?.statusCode || 500 },
    );
  }
}
