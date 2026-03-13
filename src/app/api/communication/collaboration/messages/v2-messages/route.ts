import { db } from "@/lib/db";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * @swagger
 * /api/communication/collaboration/v2-messages:
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const companyA = parseInt(searchParams.get("companyA") || "");
    const companyB = parseInt(searchParams.get("companyB") || "");
    const viewerCompanyId = parseInt(searchParams.get("viewerCompanyId") || "");

    if (!companyA || !companyB || !viewerCompanyId) {
      throw new Error("Missing required company IDs");
    }

    /* ---------------- FETCH MESSAGES ---------------- */

    const messages = await db.collaborationMessage.findMany({
      where: {
        section: "collaboration",
        OR: [
          {
            AND: [{ fromCompanyId: companyA }, { toCompanyId: companyB }],
          },
          {
            AND: [{ fromCompanyId: companyB }, { toCompanyId: companyA }],
          },
        ],
      },
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
          include: {
            invoice: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

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

    return new Response(
      JSON.stringify({
        success: true,
        messages: formattedMessages,
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
