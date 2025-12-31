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
      const merchantReferenceId = payload.merchantReferenceId;
      const authAmount = parseFloat(payload.authAmount);

      // Check if already processed
      const alreadyProcessed = await db.authorizeNetPayment.findFirst({
        where: { transactionId: transactionId },
      });

      if (alreadyProcessed) {
        return NextResponse.json(
          { message: "Already processed" },
          { status: 200 }
        );
      }

      // Extract metadata from custom fields
      const userFields = payload.userFields || [];
      const companyIdField = userFields.find(
        (f: any) => f.name === "companyId"
      );
      const payTypeField = userFields.find((f: any) => f.name === "payType");
      const invoiceIdField = userFields.find(
        (f: any) => f.name === "invoiceId"
      );
      const statementIdField = userFields.find(
        (f: any) => f.name === "statementId"
      );

      if (!companyIdField) {
        return NextResponse.json(
          { error: "Missing company ID in transaction" },
          { status: 400 }
        );
      }

      const companyId = parseInt(companyIdField.value);
      const payType = payTypeField?.value || "payment";
      const invoiceId = invoiceIdField?.value;
      const statementId = statementIdField?.value;

      // Handle fleet statement payments
      if (payType === "statement" && statementId) {
        const statement = await db.fleetStatement.findUnique({
          where: { id: statementId },
          include: {
            invoice: {
              where: { companyId: companyId },
              include: {
                client: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        });

        if (!statement || !statement.invoice.length) {
          return NextResponse.json(
            { error: "Statement or invoices not found" },
            { status: 400 }
          );
        }

        // Get or create Authorize.Net payment method
        let paymentMethod = await db.paymentMethod.findFirst({
          where: {
            companyId: companyId,
            name: "Authorize.Net",
          },
        });

        if (!paymentMethod) {
          paymentMethod = await db.paymentMethod.create({
            data: {
              name: "Authorize.Net",
              companyId: companyId,
            },
          });
        }

        // Process payment for each invoice in the statement
        let totalPaid = 0;
        const invoicesWithDue = statement.invoice.filter(
          (inv) => inv.due && Number(inv.due) > 0
        );

        const paymentRecords = [];

        for (const invoice of invoicesWithDue) {
          const paymentAmount = Math.min(
            Number(invoice.due ?? 0),
            authAmount - totalPaid
          );

          if (paymentAmount <= 0) break;

          // Create payment record
          const payment = await db.payment.create({
            data: {
              companyId: companyId,
              invoiceId: invoice.id,
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
            invoiceId: invoice.id,
          });

          // Update invoice
          await db.invoice.update({
            where: {
              id: invoice.id,
              companyId: companyId,
            },
            data: {
              due: { decrement: paymentAmount },
              totalPayment: { increment: paymentAmount },
            },
          });

          // Convert estimate to invoice if needed
          try {
            if (invoice.type === "Estimate") {
              convertInvoicePublic(invoice.id, companyId);
            }
          } catch (error) {
            console.log("Convert invoice error:", error);
          }

          totalPaid += paymentAmount;
        }

        // Create Authorize.Net payment record linked to first payment
        if (paymentRecords.length > 0) {
          await db.authorizeNetPayment.create({
            data: {
              transactionId: transactionId,
              companyId: companyId,
              paymentId: paymentRecords[0].paymentId,
              invoiceId: paymentRecords[0].invoiceId,
            },
          });
        }

        // Send notification
        const firstInvoice = statement.invoice[0];
        sendPaymentReceivedNotification({
          companyId: companyId,
          amount: totalPaid,
          clientName: `${firstInvoice?.client?.firstName} ${firstInvoice?.client?.lastName}`,
          invoiceId: statementId,
          isDeposit: false,
        });
      } else {
        // Handle individual invoice payments
        if (!invoiceId) {
          return NextResponse.json(
            { error: "Missing invoice ID" },
            { status: 400 }
          );
        }

        let paymentMethod = await db.paymentMethod.findFirst({
          where: {
            companyId: companyId,
            name: "Authorize.Net",
          },
        });

        if (!paymentMethod) {
          paymentMethod = await db.paymentMethod.create({
            data: {
              name: "Authorize.Net",
              companyId: companyId,
            },
          });
        }

        const isDeposit = payType === "deposit";
        const paymentType = isDeposit ? "DEPOSIT" : "OTHER";

        // Create payment record
        let payment;
        if (isDeposit) {
          payment = await db.payment.create({
            data: {
              companyId: companyId,
              invoiceId: invoiceId,
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
              companyId: companyId,
              invoiceId: invoiceId,
              amount: authAmount,
              type: paymentType,
              date: new Date(),
              gateway: "AUTHORIZE_NET",
              other: {
                create: {
                  paymentMethodId: paymentMethod.id,
                },
              },
            },
          });
        }

        // Create Authorize.Net payment record
        await db.authorizeNetPayment.create({
          data: {
            transactionId: transactionId,
            companyId: companyId,
            paymentId: payment.id,
            invoiceId: invoiceId,
          },
        });

        // Update invoice
        const invoice = await db.invoice.findUnique({
          where: {
            id: invoiceId,
            companyId: companyId,
          },
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
          if (isDeposit) {
            const currentDue = Number(invoice.due ?? 0);
            const depositAmount = authAmount;

            if (currentDue > 0) {
              const amountToCoverDue = Math.min(depositAmount, currentDue);
              const remainingDeposit = depositAmount - amountToCoverDue;
              const newDue = Math.max(0, currentDue - amountToCoverDue);

              await db.invoice.update({
                where: {
                  id: invoiceId,
                  companyId: companyId,
                },
                data: {
                  due: newDue,
                  totalPayment: { increment: amountToCoverDue },
                  deposit: { increment: remainingDeposit },
                },
              });
            } else {
              await db.invoice.update({
                where: {
                  id: invoiceId,
                  companyId: companyId,
                },
                data: {
                  deposit: { increment: depositAmount },
                },
              });
            }
          } else {
            await db.invoice.update({
              where: {
                id: invoiceId,
                companyId: companyId,
              },
              data: {
                due: { decrement: authAmount },
                totalPayment: { increment: authAmount },
              },
            });
          }

          // Convert estimate to invoice if needed
          try {
            if (invoice.type === "Estimate") {
              convertInvoicePublic(invoiceId, companyId);
            }
          } catch (error) {
            console.log("Convert invoice error:", error);
          }

          // Send notification
          sendPaymentReceivedNotification({
            companyId: companyId,
            amount: authAmount,
            clientName: `${invoice.client?.firstName} ${invoice.client?.lastName}`,
            invoiceId: invoiceId,
            isDeposit,
          });
        }
      }
    }

    return NextResponse.json({ message: "Webhook processed" }, { status: 200 });
  } catch (error: any) {
    console.error("Authorize.Net Webhook Error:", error);
    return NextResponse.json(
      { error: `Webhook Error: ${error?.message}` },
      { status: 400 }
    );
  }
}
