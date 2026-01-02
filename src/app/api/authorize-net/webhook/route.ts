import { db } from "@/lib/db";
import { convertInvoicePublic } from "@/actions/estimate/invoice/convert";
import { sendPaymentReceivedNotification } from "@/lib/notification/payment-notify";
import { NextRequest, NextResponse } from "next/server";

/**
 * @swagger
 * /api/authorize-net/webhook:
 *   post:
 *     summary: Authorize.Net webhook for payment notifications
 *     tags: [Authorize.Net]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json: {}
 *     responses:
 *       200:
 *         description: Webhook processed
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log(
      "Authorize.Net Webhook raw body:",
      JSON.stringify(body, null, 2)
    );

    // Authorize.Net sends webhook notifications with event type
    const eventType = body.eventType;
    const payload = body.payload;

    console.log("Authorize.Net Webhook received:", eventType);

    // Handle successful payment notification
    if (
      eventType === "net.authorize.payment.authcapture.created" ||
      eventType === "net.authorize.payment.authorization.created"
    ) {
      const transactionId = payload.id;
      const authAmount = parseFloat(payload.authAmount);
      const invoiceNumber = payload.invoiceNumber as string | undefined;

      console.log("Authorize.Net payload parsed:", {
        transactionId,
        authAmount,
        invoiceNumber,
      });

      // Check if already processed
      const alreadyProcessed = await db.authorizeNetPayment.findFirst({
        where: { transactionId },
      });

      if (alreadyProcessed) {
        return NextResponse.json(
          { message: "Already processed" },
          { status: 200 }
        );
      }

      if (!invoiceNumber) {
        console.warn("Authorize.Net webhook missing invoiceNumber in payload", {
          transactionId,
        });
        return NextResponse.json(
          { message: "No invoice to process" },
          { status: 200 }
        );
      }

      // Try to interpret invoiceNumber as our internal ID, similar to Stripe's metadata
      const numericId = invoiceNumber;
      if (Number.isNaN(numericId)) {
        console.warn("Authorize.Net invoiceNumber is not numeric, skipping", {
          invoiceNumber,
          transactionId,
        });
        return NextResponse.json(
          { message: "Unrecognized invoice number" },
          { status: 200 }
        );
      }

      // First, try treating it as an invoice payment (Stripe individual invoice logic)
      const invoice = await db.invoice.findUnique({
        where: { id: numericId },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (invoice) {
        const companyId = invoice.companyId;
        const isDeposit = false; // We don't have payType in webhook payload, default to normal payment
        const paymentType = isDeposit ? "DEPOSIT" : "OTHER";

        // Get or create Authorize.Net payment method (same idea as Stripe's "Stripe" method)
        let paymentMethod = await db.paymentMethod.findFirst({
          where: {
            companyId,
            name: "Authorize.Net",
          },
        });

        if (!paymentMethod && !isDeposit) {
          paymentMethod = await db.paymentMethod.create({
            data: {
              name: "Authorize.Net",
              companyId,
            },
          });
        }

        // Create payment record (mirroring Stripe's individual invoice path)
        let payment;
        if (isDeposit) {
          payment = await db.payment.create({
            data: {
              companyId,
              invoiceId: numericId,
              amount: authAmount,
              type: paymentType,
              date: new Date(),
              gateway: "AUTHORIZE_NET",
              deposit: {
                create: {
                  depositMethod: "Authorize.Net",
                  depositNotes: "Deposit payment via Authorize.Net",
                },
              },
            },
          });
        } else {
          payment = await db.payment.create({
            data: {
              companyId,
              invoiceId: numericId,
              amount: authAmount,
              type: paymentType,
              date: new Date(),
              gateway: "AUTHORIZE_NET",
              other: paymentMethod
                ? {
                    create: {
                      paymentMethodId: paymentMethod.id,
                    },
                  }
                : undefined,
            },
          });
        }

        // Create Authorize.Net payment record
        await db.authorizeNetPayment.create({
          data: {
            transactionId,
            companyId,
            paymentId: payment.id,
            invoiceId: numericId,
          },
        });

        // Update invoice balances (same business rules as Stripe non-deposit)
        await db.invoice.update({
          where: {
            id: numericId,
            companyId,
          },
          data: {
            due: { decrement: authAmount },
            totalPayment: { increment: authAmount },
          },
        });

        // Convert estimate to invoice if needed
        try {
          if (invoice.type === "Estimate") {
            convertInvoicePublic(numericId, companyId);
          }
        } catch (error) {
          console.log("Convert invoice error:", error);
        }

        // Send notification (same shape as Stripe)
        sendPaymentReceivedNotification({
          companyId,
          amount: authAmount,
          clientName: `${invoice.client?.firstName} ${invoice.client?.lastName}`,
          invoiceId: numericId,
          isDeposit,
        });

        return NextResponse.json(
          { message: "Webhook processed" },
          { status: 200 }
        );
      }

      // If no invoice, try treating it as a fleet statement payment (Stripe statement logic)
      const statement = await db.fleetStatement.findUnique({
        where: { id: numericId },
        include: {
          invoice: {
            include: {
              client: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          Fleet: {
            include: {
              client: {
                select: {
                  companyId: true,
                },
              },
            },
          },
        },
      });

      if (!statement || !statement.invoice.length) {
        console.warn(
          "Authorize.Net could not match invoiceNumber to invoice or statement",
          {
            invoiceNumber,
            transactionId,
          }
        );
        return NextResponse.json(
          { message: "No matching invoice/statement" },
          { status: 200 }
        );
      }

      const companyId = statement.Fleet.client.companyId;

      // Get or create Authorize.Net payment method for statement invoices
      let paymentMethod = await db.paymentMethod.findFirst({
        where: {
          companyId,
          name: "Authorize.Net",
        },
      });

      if (!paymentMethod) {
        paymentMethod = await db.paymentMethod.create({
          data: {
            name: "Authorize.Net",
            companyId,
          },
        });
      }

      let totalPaid = 0;
      const invoicesWithDue = statement.invoice.filter(
        (inv) => inv.due && Number(inv.due) > 0
      );

      const paymentRecords: { paymentId: number; invoiceId: any }[] = [];

      for (const inv of invoicesWithDue) {
        const paymentAmount = Math.min(
          Number(inv.due ?? 0),
          authAmount - totalPaid
        );

        if (paymentAmount <= 0) break;

        const payment = await db.payment.create({
          data: {
            companyId,
            invoiceId: inv.id,
            amount: paymentAmount,
            type: "OTHER",
            date: new Date(),
            gateway: "AUTHORIZE_NET",
            other: {
              create: {
                paymentMethodId: paymentMethod.id,
              },
            },
          },
        });

        paymentRecords.push({
          paymentId: payment.id,
          invoiceId: inv.id,
        });

        await db.invoice.update({
          where: {
            id: inv.id,
            companyId,
          },
          data: {
            due: { decrement: paymentAmount },
            totalPayment: { increment: paymentAmount },
          },
        });

        try {
          if (inv.type === "Estimate") {
            convertInvoicePublic(inv.id, companyId);
          }
        } catch (error) {
          console.log("Convert invoice error:", error);
        }

        totalPaid += paymentAmount;
      }

      if (paymentRecords.length > 0) {
        await db.authorizeNetPayment.create({
          data: {
            transactionId,
            companyId,
            paymentId: paymentRecords[0].paymentId,
            invoiceId: paymentRecords[0].invoiceId,
          },
        });
      }

      const firstInvoice = statement.invoice[0];
      sendPaymentReceivedNotification({
        companyId,
        amount: totalPaid,
        clientName: `${firstInvoice?.client?.firstName} ${firstInvoice?.client?.lastName}`,
        invoiceId: numericId,
        isDeposit: false,
      });

      return NextResponse.json(
        { message: "Webhook processed" },
        { status: 200 }
      );
    }

    return NextResponse.json({ message: "Webhook processed" }, { status: 200 });
  } catch (error: any) {
    console.error("Authorize.Net Webhook Error:", error?.message, error?.stack);
    return NextResponse.json(
      { error: `Webhook Error: ${error?.message}` },
      { status: 400 }
    );
  }
}
