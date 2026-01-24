import { db } from "@/lib/db";
import { NextResponse } from "next/server";


/**
 * @swagger
 * /api/ai-train/company-knowledge/{id}:
 *   get:
 *     summary: Get company info by ID
 *     tags: [Company Knowledge]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company Info  retrieved successfully
 *       404:
 *         description: Company info not found
 *       500:
 *         description: Internal server error
 */
export async function GET(_: Request, { params }: { params: { id: number } }) {

    try {
        const companyInfo = await db.companyInfo.findUnique({
            where: { id: Number(params.id) },
            select: {
                shopName:true,
                about:true,
                address:true,
                phone:true,
                websiteUrl:true,
                hours:true,
                policies:true
            }
        })

        if (!companyInfo) {
            return NextResponse.json(
                { success: false, message: "Company info not found" },
                { status: 404 },
            );
        }
        return NextResponse.json({
            success: true,
            message: "Company Info retrieved successfully",
            data: companyInfo,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, message: "Internal server error" },
            { status: 500 },
        );
    }
}