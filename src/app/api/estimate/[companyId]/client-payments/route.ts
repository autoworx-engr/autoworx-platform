import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";

/**
 * @swagger
 * /api/estimate/{companyId}/client-payments:
 *   get:
 *     summary: Get payment tab data for a client
 *     description: >
 *       Returns all payment and transaction data for a specific client, scoped to the given company.
 *       Includes invoice payments (with refund details, due-after-payment, vehicle info, status),
 *       a full transaction history (payments + refunds sorted newest-first), summary totals
 *       (total quoted, total paid, total refunded, transaction count), and top 3 most-ordered services.
 *       This mirrors the data shown in the PaymentTab component on the estimate create page.
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4
 *         description: Company ID
 *       - in: query
 *         name: clientId
 *         required: true
 *         schema:
 *           type: integer
 *           example: 12
 *         description: Client ID whose payment data should be returned
 *     responses:
 *       200:
 *         description: Payment data fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       description: Aggregate totals across all invoices for this client
 *                       properties:
 *                         totalQuoted:
 *                           type: number
 *                           example: 1500.00
 *                         totalPaid:
 *                           type: number
 *                           example: 1200.00
 *                         totalRefunded:
 *                           type: number
 *                           example: 100.00
 *                         totalTransactions:
 *                           type: integer
 *                           example: 5
 *                     topServices:
 *                       type: array
 *                       description: Top 3 most-ordered services for this client
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           count:
 *                             type: integer
 *                             description: Number of times this service was ordered
 *                     invoicePayments:
 *                       type: array
 *                       description: One entry per payment, with full invoice and refund context
 *                       items:
 *                         type: object
 *                         properties:
 *                           invoiceId:
 *                             type: string
 *                           paymentId:
 *                             type: integer
 *                           vehicle:
 *                             type: string
 *                             nullable: true
 *                           amountPaid:
 *                             type: number
 *                           refundedAmount:
 *                             type: number
 *                           netAmount:
 *                             type: number
 *                           paymentMethod:
 *                             type: string
 *                             description: Human-readable payment method (card type, OTHER method name, or PaymentType)
 *                           cashReceived:
 *                             type: string
 *                             nullable: true
 *                           paymentDate:
 *                             type: string
 *                             format: date-time
 *                           due:
 *                             type: number
 *                             description: Amount still due after this payment
 *                           grandTotal:
 *                             type: number
 *                           deposit:
 *                             type: number
 *                           status:
 *                             type: string
 *                             nullable: true
 *                             description: Pipeline column title (e.g. "In Progress", "Delivered")
 *                           notes:
 *                             type: string
 *                             nullable: true
 *                           checkNumber:
 *                             type: string
 *                             nullable: true
 *                           card:
 *                             type: object
 *                             properties:
 *                               creditCard:
 *                                 type: string
 *                               cardType:
 *                                 type: string
 *                           depositMethod:
 *                             type: string
 *                           depositNotes:
 *                             type: string
 *                           paymentType:
 *                             type: string
 *                             description: Raw PaymentType enum value (CASH, CARD, CHECK, OTHER, DEPOSIT)
 *                     transactions:
 *                       type: array
 *                       description: Full transaction history (payments and refunds), sorted newest-first
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: "Prefixed ID: 'payment-{id}' or 'refund-{id}'"
 *                           type:
 *                             type: string
 *                             enum: [PAYMENT, REFUND]
 *                           invoiceId:
 *                             type: string
 *                           vehicle:
 *                             type: string
 *                             nullable: true
 *                           amount:
 *                             type: number
 *                             description: Positive for payments, negative for refunds
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           method:
 *                             type: string
 *                           notes:
 *                             type: string
 *                             nullable: true
 *                           paymentId:
 *                             type: integer
 *                           cashReceived:
 *                             type: string
 *                             nullable: true
 *       400:
 *         description: Invalid company ID or missing clientId
 *       404:
 *         description: Client not found or does not belong to this company
 *       500:
 *         description: Internal server error
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId: companyIdParam } = await params;
    const jwtCompanyId = (await getAuthPrincipal(req))?.companyId ?? null;
    if (jwtCompanyId === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const urlCompanyId = parseInt(companyIdParam, 10);

    if (isNaN(urlCompanyId) || urlCompanyId !== jwtCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = jwtCompanyId;

    const { searchParams } = new URL(req.url);
    const clientIdParam = searchParams.get("clientId");

    if (!clientIdParam) {
      return NextResponse.json(
        { success: false, message: "clientId query parameter is required" },
        { status: 400 },
      );
    }

    const clientId = Number(clientIdParam);
    if (isNaN(clientId)) {
      return NextResponse.json(
        { success: false, message: "Invalid clientId" },
        { status: 400 },
      );
    }

    const client = await db.client.findFirst({
      where: { id: clientId, companyId },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, message: "Client not found" },
        { status: 404 },
      );
    }

    const invoices = await db.invoice.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      select: {
        invoiceItems: { select: { service: true, serviceId: true, id: true } },
        column: { select: { title: true } },
        grandTotal: true,
        due: true,
        deposit: true,
        vehicleId: true,
        createdAt: true,
        customerNotes: true,
        id: true,
      },
    });

    const invoiceIds = invoices.map((invoice) => invoice.id);

    // Resolve vehicle models up front
    const vehicleIds = [
      ...new Set(
        invoices.map((inv) => inv.vehicleId).filter(Boolean) as number[],
      ),
    ];
    const vehicles = await db.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: { id: true, model: true },
    });
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v.model ?? ""]));

    const allPayments = await db.payment.findMany({
      where: { invoiceId: { in: invoiceIds } },
      select: {
        id: true,
        invoiceId: true,
        amount: true,
        dueAfterPayment: true,
        refundedAmount: true,
        other: true,
        type: true,
        card: true,
        check: true,
        notes: true,
        cash: true,
        deposit: true,
        createdAt: true,
        date: true,
        Refund: {
          select: {
            id: true,
            amount: true,
            reason: true,
            method: true,
            refundDate: true,
            notes: true,
          },
        },
      },
    });

    const sortedPayments = [...allPayments].sort(
      (a, b) =>
        new Date(a.date || a.createdAt).getTime() -
        new Date(b.date || b.createdAt).getTime(),
    );

    // Resolve OTHER payment method names in bulk
    const otherMethodIds = sortedPayments
      .filter((p) => p.type === "OTHER" && p.other?.paymentMethodId)
      .map((p) => p.other!.paymentMethodId as number);
    const uniqueMethodIds = [...new Set(otherMethodIds)];
    const paymentMethods =
      uniqueMethodIds.length > 0
        ? await db.paymentMethod.findMany({
            where: { id: { in: uniqueMethodIds } },
            select: { id: true, name: true },
          })
        : [];
    const methodMap = new Map(paymentMethods.map((m) => [m.id, m.name ?? ""]));

    const invoicePayments: Record<string, any>[] = [];
    const transactions: Record<string, any>[] = [];

    for (let i = 0; i < sortedPayments.length; i++) {
      const payment = sortedPayments[i];
      const originalInvoice = invoices.find(
        (inv) => inv.id === payment.invoiceId,
      );
      if (!originalInvoice) continue;

      const vehicleModel = originalInvoice.vehicleId
        ? (vehicleMap.get(originalInvoice.vehicleId) ?? "")
        : "";

      let paymentMethodText = "";
      if (payment.type === "OTHER") {
        const methodId = payment.other?.paymentMethodId;
        paymentMethodText = methodId ? (methodMap.get(methodId) ?? "") : "";
      } else if (payment.type === "CARD") {
        paymentMethodText = payment.card?.cardType ?? "";
      } else {
        paymentMethodText = payment.type ?? "";
      }

      const actualRefundedAmount = payment.Refund.reduce(
        (sum, refund) => sum + Number(refund.amount),
        0,
      );
      const originalAmount = Number(payment.amount ?? 0);
      const netAmount = originalAmount - actualRefundedAmount;

      let dueAfterPayment: number;
      if (
        payment.dueAfterPayment !== null &&
        payment.dueAfterPayment !== undefined
      ) {
        dueAfterPayment = Number(payment.dueAfterPayment);
      } else {
        const grandTotal = Number(originalInvoice.grandTotal || 0);
        const paymentsUpToThis = sortedPayments.slice(0, i + 1);
        const totalPaidUpToThis = paymentsUpToThis.reduce((sum, pmt) => {
          if (pmt.invoiceId !== payment.invoiceId) return sum;
          const refunds = pmt.Refund.reduce(
            (rSum, r) => rSum + Number(r.amount),
            0,
          );
          return sum + Number(pmt.amount || 0) - refunds;
        }, 0);
        dueAfterPayment = grandTotal - totalPaidUpToThis;
      }

      const isDeposit = payment.type === "DEPOSIT";
      const paymentMethodInfo = payment.cash
        ? payment.cash
        : payment.card
          ? payment.card
          : payment.other
            ? payment.other
            : payment.deposit;

      invoicePayments.push({
        invoiceId: originalInvoice.id,
        paymentId: payment.id,
        vehicle: vehicleModel,
        amountPaid: originalAmount,
        refundedAmount: actualRefundedAmount,
        netAmount,
        paymentMethod: paymentMethodText,
        paymentType: payment.type,
        cashReceived:
          paymentMethodInfo && "receivedCash" in paymentMethodInfo
            ? ((paymentMethodInfo as any).receivedCash ?? null)
            : null,
        paymentDate: payment.date || originalInvoice.createdAt,
        due: dueAfterPayment,
        grandTotal: Number(originalInvoice.grandTotal || 0),
        deposit: isDeposit
          ? originalAmount
          : Number(originalInvoice.deposit || 0),
        status: originalInvoice.column?.title ?? null,
        notes: payment.notes ?? null,
        checkNumber: payment.check?.checkNumber ?? null,
        card: {
          creditCard: payment.card
            ? ((payment.card as any).creditCard ?? "")
            : "",
          cardType: payment.card ? ((payment.card as any).cardType ?? "") : "",
        },
        depositMethod: isDeposit
          ? ((paymentMethodInfo as any)?.depositMethod ?? "")
          : "",
        depositNotes: isDeposit
          ? ((paymentMethodInfo as any)?.depositNotes ?? "")
          : "",
      });

      transactions.push({
        id: `payment-${payment.id}`,
        type: "PAYMENT",
        invoiceId: originalInvoice.id,
        vehicle: vehicleModel,
        amount: originalAmount,
        date: payment.date || originalInvoice.createdAt,
        method: paymentMethodText,
        notes: payment.notes ?? null,
        paymentId: payment.id,
        cashReceived: payment.cash
          ? ((payment.cash as any).receivedCash ?? null)
          : null,
      });

      payment.Refund.forEach((refund) => {
        transactions.push({
          id: `refund-${refund.id}`,
          type: "REFUND",
          invoiceId: originalInvoice.id,
          vehicle: vehicleModel,
          amount: -Number(refund.amount),
          date: refund.refundDate,
          method: refund.method,
          notes: refund.notes || refund.reason,
          paymentId: payment.id,
          cashReceived: null,
        });
      });
    }

    transactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    // Summary totals
    const totalQuoted = invoices.reduce(
      (acc, inv) =>
        acc + (inv.grandTotal ? parseFloat(inv.grandTotal.toString()) : 0),
      0,
    );
    const totalPaid = allPayments.reduce(
      (acc, p) => acc + Number(p.amount ?? 0),
      0,
    );
    const totalRefunded = allPayments.reduce((acc, p) => {
      const refundSum = p.Refund.reduce((sum, r) => sum + Number(r.amount), 0);
      return acc + refundSum;
    }, 0);

    // Top services
    const serviceCountMap = new Map<
      number,
      { id: number; name: string; count: number }
    >();
    invoices.forEach((invoice) => {
      invoice.invoiceItems.forEach((item) => {
        if (item.serviceId && item.service) {
          const entry = serviceCountMap.get(item.serviceId);
          if (entry) {
            entry.count += 1;
          } else {
            serviceCountMap.set(item.serviceId, {
              id: item.service.id,
              name: item.service.name,
              count: 1,
            });
          }
        }
      });
    });

    const topServices = [...serviceCountMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalQuoted,
          totalPaid,
          totalRefunded,
          totalTransactions: transactions.length,
        },
        topServices,
        invoicePayments,
        transactions,
      },
    });
  } catch (error) {
    console.error("CLIENT PAYMENTS ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch client payment data" },
      { status: 500 },
    );
  }
}
