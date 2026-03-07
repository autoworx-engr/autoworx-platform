import { db } from "@/lib/db";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

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
        requestEstimate: true,
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
