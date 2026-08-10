import { NextRequest, NextResponse } from "next/server";
import { fetchLastMailsMailgun } from "@/actions/communication/client/fetchLastMailgunMails";

/**
 * @swagger
 * /api/communication/client-hub/fetch-last-mailgun-mails:
 *   get:
 *     summary: Fetch last emails for all clients
 *     tags: [Communication Client]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Last mails retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Last mails retrieved successfully!
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                         example: 8
 *                       subject:
 *                         type: string
 *                         example: Application for appointment
 *                       text:
 *                         type: string
 *                         example: testing attachment issue
 *                       emailBy:
 *                         type: string
 *                         example: Company
 *                       messageId:
 *                         type: string
 *                         example: z6flaf3g6yoqjjsnz4fx
 *                       companyId:
 *                         type: number
 *                         example: 1
 *                       clientId:
 *                         type: number
 *                         example: 8
 *                       userId:
 *                         type: number
 *                         nullable: true
 *                         example: null
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-11-18T13:28:28.087Z
 *                       client:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           id:
 *                             type: number
 *                             example: 8
 *                           firstName:
 *                             type: string
 *                             example: MD
 *                           lastName:
 *                             type: string
 *                             example: Abu Bokor
 *                           mobile:
 *                             type: string
 *                             example: 01885236058
 *                           countryCode:
 *                             type: string
 *                             example: US
 *                           email:
 *                             type: string
 *                             example: abubokor1066@gmail.com
 *                           address:
 *                             type: string
 *                             nullable: true
 *                             example: null
 *                           city:
 *                             type: string
 *                             nullable: true
 *                           state:
 *                             type: string
 *                             nullable: true
 *                           zip:
 *                             type: string
 *                             nullable: true
 *                           isFleet:
 *                             type: boolean
 *                             example: false
 *                           photo:
 *                             type: string
 *                             example: /images/default.png
 *                           fromRequest:
 *                             type: boolean
 *                             example: false
 *                           fromRequestedCompanyId:
 *                             type: number
 *                             nullable: true
 *                           sourceId:
 *                             type: number
 *                             nullable: true
 *                           converted:
 *                             type: boolean
 *                             example: false
 *                           companyId:
 *                             type: number
 *                             example: 1
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                           customerCompany:
 *                             type: object
 *                             nullable: true
 *                           tagId:
 *                             type: number
 *                             nullable: true
 *                           notes:
 *                             type: string
 *                             nullable: true
 *                           leadId:
 *                             type: number
 *                             example: 17
 *                           firstContactTime:
 *                             type: string
 *                             nullable: true
 *                           lastMailgunEmailReadId:
 *                             type: number
 *                             nullable: true
 *                           isStarred:
 *                             type: boolean
 *                             example: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function GET(req: NextRequest) {
  try {
    const data = await fetchLastMailsMailgun();

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch last emails" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Last mails retrieved successfully!",
      data: data.data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}
