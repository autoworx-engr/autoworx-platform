import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteObject } from "@/actions/s3/deleteObject";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

/**
 * @swagger
 * /api/estimate/{companyId}/{id}/technicians/{techId}/images/{imageId}:
 *   delete:
 *     summary: Delete a technician work-order photo
 *     description: Removes a technician image from S3 and the database. Mirrors the deleteTechnicianImage server action, scoped to the caller's company, invoice and technician. Allowed for the assigned technician or an Admin/Manager.
 *     tags: [Work Order]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema: { type: integer, example: 4 }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: "clxyz123" }
 *         description: Invoice/estimate ID (cuid)
 *       - in: path
 *         name: techId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Image deleted }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Image not found }
 *       500: { description: Internal server error }
 */

type Params = Promise<{
  companyId: string;
  id: string;
  techId: string;
  imageId: string;
}>;

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  try {
    const {
      companyId: companyIdParam,
      id,
      techId: techIdParam,
      imageId: imageIdParam,
    } = await params;

    const principal = await getAuthPrincipal(req);
    if (!principal) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);
    if (isNaN(urlCompanyId) || urlCompanyId !== principal.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const techId = parseInt(techIdParam, 10);
    const imageId = parseInt(imageIdParam, 10);
    if (isNaN(techId) || isNaN(imageId)) {
      return NextResponse.json(
        { success: false, message: "Invalid technician or image id" },
        { status: 404 },
      );
    }

    // Image must belong to the technician, which must belong to the invoice
    // in the caller's company.
    const image = await db.technicianImage.findFirst({
      where: {
        id: imageId,
        technicianId: techId,
        technician: { invoiceId: id, companyId: principal.companyId },
      },
      include: { technician: { select: { userId: true } } },
    });
    if (!image) {
      return NextResponse.json(
        { success: false, message: "Image not found" },
        { status: 404 },
      );
    }

    // Only the assigned technician or an Admin/Manager may delete the photo.
    const user = await db.user.findUnique({ where: { id: principal.userId } });
    const isAdminOrManager =
      user?.employeeType === "Admin" || user?.employeeType === "Manager";
    if (image.technician.userId !== principal.userId && !isAdminOrManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Best-effort S3 cleanup; never block the DB delete on storage failure.
    if (image.fileUrl) {
      try {
        await deleteObject(image.fileUrl);
      } catch (err) {
        console.error("Failed to delete image object from storage", err);
      }
    }

    await db.technicianImage.delete({ where: { id: imageId } });

    return NextResponse.json({
      success: true,
      message: "Image successfully deleted",
    });
  } catch (error: any) {
    console.error("TECHNICIAN IMAGE DELETE ERROR:", error);
    const normalized = errorHandler(error);
    return NextResponse.json(
      {
        success: false,
        message: normalized.message || "Failed to delete image",
      },
      { status: normalized.statusCode || 500 },
    );
  }
}
