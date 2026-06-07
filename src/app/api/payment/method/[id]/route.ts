import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: { id: string } };

/**
 * @swagger
 * /api/payment/method/{id}:
 *   patch:
 *     summary: Update a payment method name
 *     tags: [Payment Methods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 3
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 example: "Zelle"
 *     responses:
 *       200:
 *         description: Payment method updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Payment method updated"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     companyId:
 *                       type: integer
 *       400:
 *         description: name is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment method not found
 *       409:
 *         description: A payment method with this name already exists
 *       500:
 *         description: Internal server error
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const existing = await db.paymentMethod.findUnique({
      where: { id, companyId: principal.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 },
      );
    }

    const duplicate = await db.paymentMethod.findFirst({
      where: { name, companyId: principal.companyId, id: { not: id } },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "A payment method with this name already exists" },
        { status: 409 },
      );
    }

    const updated = await db.paymentMethod.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json({
      status: 200,
      message: "Payment method updated",
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/payment/method/{id}:
 *   delete:
 *     summary: Delete a payment method
 *     description: >
 *       Deletes the payment method. Returns 409 if it is currently
 *       referenced by one or more existing payments.
 *     tags: [Payment Methods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 3
 *     responses:
 *       200:
 *         description: Payment method deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Payment method deleted"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment method not found
 *       409:
 *         description: Cannot delete — in use by existing payments
 *       500:
 *         description: Internal server error
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const existing = await db.paymentMethod.findUnique({
      where: { id, companyId: principal.companyId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 },
      );
    }

    const inUse = await db.otherPayment.count({
      where: { paymentMethodId: id },
    });

    if (inUse > 0) {
      return NextResponse.json(
        { error: `Cannot delete — used by ${inUse} existing payment(s)` },
        { status: 409 },
      );
    }

    await db.paymentMethod.delete({ where: { id } });

    return NextResponse.json({
      status: 200,
      message: "Payment method deleted",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
