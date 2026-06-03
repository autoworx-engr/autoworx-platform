import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { validateCompanyId } from "../../utils";

/**
 * @swagger
 * /api/ai-train/faq/{id}:
 *   delete:
 *     summary: Delete a specific FAQ by index
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 0
 *         description: FAQ index to delete (0-based)
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: FAQ deleted successfully
 *       400:
 *         description: Company ID is required or invalid index
 *       404:
 *         description: Company info or FAQ not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const validation = validateCompanyId(req);
    if (validation instanceof NextResponse) return validation;
    const { companyId } = validation;

    const faqIndex = Number(params.id);

    if (!Number.isFinite(faqIndex) || faqIndex < 0) {
      return NextResponse.json(
        { success: false, message: "Invalid FAQ index" },
        { status: 400 },
      );
    }

    // Get company info with FAQs
    const companyInfo = await db.companyInfo.findFirst({
      where: { companyId },
      select: {
        id: true,
        overallFaqs: true,
      },
    });

    if (!companyInfo) {
      return NextResponse.json(
        { success: false, message: "Company info not found" },
        { status: 404 },
      );
    }

    const faqs = Array.isArray(companyInfo.overallFaqs)
      ? companyInfo.overallFaqs
      : [];

    if (faqIndex >= faqs.length) {
      return NextResponse.json(
        { success: false, message: "FAQ not found" },
        { status: 404 },
      );
    }

    // Remove FAQ at index
    faqs.splice(faqIndex, 1);

    // Update company info
    const updatedInfo = await db.companyInfo.update({
      where: { id: companyInfo.id },
      data: {
        overallFaqs: faqs,
      },
    });

    return NextResponse.json({
      success: true,
      message: "FAQ deleted successfully",
      data: updatedInfo.overallFaqs,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
