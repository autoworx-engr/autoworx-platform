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

      // Extract tip from invoiceNumber suffix (encoded as "-T<amount>")
      // Authorize.Net webhook payloads only include bare fields — no
      // order description or userFields — so tip is encoded in invoiceNumber.
      const tipMatch = invoiceNumber?.match(/-T([\d.]+)$/);
      const tipAmount = tipMatch ? parseFloat(tipMatch[1]) : 0;
      const baseAmount = authAmount - tipAmount;

      console.log("Authorize.Net payload parsed:", {
        transactionId,
        authAmount,
        invoiceNumber,
        tipAmount,
        baseAmount,
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

      // Decode our own prefixes from invoiceNumber so we know whether
      // this is a deposit, normal invoice payment, or a statement
      // payment. This mirrors how Stripe uses metadata.
      // Strip the tip suffix (e.g. "-T8") before decoding the prefix.
      const rawInvoiceNumber = invoiceNumber.replace(/-T[\d.]+$/, "");
      let targetId = rawInvoiceNumber;
      let sourceType: "deposit" | "invoice" | "statement" | "unknown" =
        "unknown";

      if (rawInvoiceNumber.startsWith("DEP-")) {
        sourceType = "deposit";
        targetId = rawInvoiceNumber.substring(4);
      } else if (rawInvoiceNumber.startsWith("INV-")) {
        sourceType = "invoice";
        targetId = rawInvoiceNumber.substring(4);
      } else if (rawInvoiceNumber.startsWith("STM-")) {
        sourceType = "statement";
        targetId = rawInvoiceNumber.substring(4);
      }

      console.log("Authorize.Net decoded invoiceNumber", {
        rawInvoiceNumber,
        sourceType,
        targetId,
      });

      // First, try treating it as an invoice payment (Stripe individual invoice logic)
      const invoice = await db.invoice.findUnique({
        where: { id: targetId },
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

        // Infer deposit vs normal payment primarily from the
        // encoded invoiceNumber prefix, mirroring Stripe's
        // payType-based behavior.
        const isDepositFromPrefix = sourceType === "deposit";

        // Keep a small heuristic as a fallback (in case some
        // old transactions didn't have the prefix yet).
        const orderDescription =
          (payload.order?.description as string | undefined) ||
          (payload.order?.invoiceDescription as string | undefined) ||
          (payload.description as string | undefined) ||
          "";

        const lowerOrderDescription = orderDescription.toString().toLowerCase();
        const serializedPayload = JSON.stringify(payload || {}).toLowerCase();

        const isDepositHeuristic =
          lowerOrderDescription.includes("deposit") ||
          serializedPayload.includes("deposit payment");

        const isDeposit = isDepositFromPrefix || isDepositHeuristic;

        console.log("Authorize.Net webhook invoice payment classification", {
          invoiceId: targetId,
          authAmount,
          rawInvoiceNumber,
          sourceType,
          orderDescription,
          isDeposit,
        });

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
              invoiceId: targetId,
              amount: baseAmount,
              tip: tipAmount,
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
              invoiceId: targetId,
              amount: baseAmount,
              tip: tipAmount,
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
            invoiceId: targetId,
          },
        });

        // Update invoice balances using the same business rules as Stripe
        // Use baseAmount (excluding tip) so the tip doesn't reduce the invoice due
        const currentDue = Number(invoice.due ?? 0);

        if (isDeposit) {
          const depositAmount = baseAmount;
          console.log("🚀 ~ POST ~ depositAmount:", depositAmount);

          if (currentDue > 0) {
            const amountToCoverDue = Math.min(depositAmount, currentDue);
            const newDue = Math.max(0, currentDue - amountToCoverDue);

            await db.invoice.update({
              where: {
                id: targetId,
                companyId,
              },
              data: {
                due: newDue,
                deposit: {
                  increment: depositAmount,
                },
              },
            });
          } else {
            await db.invoice.update({
              where: {
                id: targetId,
                companyId,
              },
              data: {
                deposit: {
                  increment: depositAmount,
                },
              },
            });
          }
        } else {
          const paymentAmount = baseAmount;
          const amountToApply = Math.min(paymentAmount, currentDue);
          const newDue = Math.max(0, currentDue - amountToApply);

          await db.invoice.update({
            where: {
              id: targetId,
              companyId,
            },
            data: {
              due: newDue,
              totalPayment: {
                increment: amountToApply,
              },
            },
          });
        }

        // Convert estimate to invoice if needed
        try {
          if (invoice.type === "Estimate") {
            convertInvoicePublic(targetId, companyId);
          }
        } catch (error) {
          console.log("Convert invoice error:", error);
        }

        // Send notification (same shape as Stripe)
        sendPaymentReceivedNotification({
          companyId,
          amount: authAmount,
          clientName: `${invoice.client?.firstName} ${invoice.client?.lastName}`,
          invoiceId: targetId,
          isDeposit,
        });

        return NextResponse.json(
          { message: "Webhook processed" },
          { status: 200 }
        );
      }

      // If no invoice, try treating it as a fleet statement payment (Stripe statement logic)
      const statement = await db.fleetStatement.findUnique({
        where: { id: targetId },
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

      // Use baseAmount (excluding tip) for distributing across invoices
      let totalPaid = 0;
      const invoicesWithDue = statement.invoice.filter(
        (inv) => inv.due && Number(inv.due) > 0
      );

      const paymentRecords: { paymentId: number; invoiceId: any }[] = [];
      let isFirstPayment = true;

      for (const inv of invoicesWithDue) {
        const paymentAmount = Math.min(
          Number(inv.due ?? 0),
          baseAmount - totalPaid
        );

        if (paymentAmount <= 0) break;

        // Store tip on the first payment record only
        const tipForThisRecord = isFirstPayment ? tipAmount : 0;
        isFirstPayment = false;

        const payment = await db.payment.create({
          data: {
            companyId,
            invoiceId: inv.id,
            amount: paymentAmount,
            tip: tipForThisRecord,
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
        invoiceId: targetId,
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
