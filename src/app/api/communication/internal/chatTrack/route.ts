import { NextRequest } from "next/server";
import { updateChatTrackHandler } from "./_handlers/updateChatTrack";
import { upsertChatTrackHandler } from "./_handlers/upsertChatTrack";

/**
 * @swagger
 * /api/communication/internal/chatTrack:
 *   put:
 *     summary: Update chat track status and last message
 *     tags: [Internal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chatTrackId
 *             properties:
 *               chatTrackId:
 *                 type: string
 *                 description: The ID of the chat track to update
 *               isRead:
 *                 type: boolean
 *                 description: Whether the chat track is marked as read
 *               lastMessage:
 *                 type: string
 *                 description: The content of the last message
 *     responses:
 *       200:
 *         description: Chat track updated successfully
 *       400:
 *         description: ChatTrack ID is required
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */

export const PUT = (req: NextRequest) => updateChatTrackHandler(req);

/**
 * @swagger
 * /api/communication/internal/chatTrack:
 *   post:
 *     summary: Create or retrieve a chat track
 *     tags: [Internal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - senderId
 *               - receiverId
 *             properties:
 *               senderId:
 *                 type: integer
 *                 description: ID of the sender
 *               receiverId:
 *                 type: integer
 *                 description: ID of the receiver
 *               lastMessage:
 *                 type: string
 *                 description: Initial message content
 *               isRead:
 *                 type: boolean
 *                 description: Initial read status
 *     responses:
 *       200:
 *         description: Chat track created or retrieved successfully
 *       400:
 *         description: Sender ID and Receiver ID are required
 *       500:
 *         description: Internal Server Error
 */
export const POST = (req: NextRequest) => upsertChatTrackHandler(req);
