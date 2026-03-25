import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { AppError } from "@/error-boundary/error";
import { z } from "zod";
import { TransactionType, Prisma, DeliveryMethod } from "@prisma/client";
import { nanoid } from "nanoid";
import { addCustomer } from "@/actions/client/add";
import { sendTwilioMessage } from "@/actions/communication/client/sendTwilioMessage";
import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";
import { sendInfobipEmail } from "@/actions/estimate/invoice/sendInfobipEmail";
import { errorHandler } from "@/error-boundary/globalErrorHandler";

const buyGiftCardSchema = z.object({
  shopId: z.number({ required_error: "shopId is required" }),
  templateId: z.number({ required_error: "templateId is required" }),
  purchaseType: z.enum(["INDIVIDUAL", "MULTIPLE_RECIPIENTS", "GROUP_GIFT"], {
    required_error: "purchaseType is required",
  }),
  amount: z.number({ required_error: "amount is required" }).positive(),
  promoCode: z.string().optional(),
  purchaserName: z
    .string({ required_error: "purchaserName is required" })
    .min(1),
  purchaserEmail: z
    .string({ required_error: "purchaserEmail is required" })
    .email(),
  purchaserPhone: z.string().optional(),
  isSendToMyself: z.boolean({ required_error: "isSendToMyself is required" }),
  deliveryMethod: z.enum(["EMAIL", "SMS", "BOTH"], {
    required_error: "deliveryMethod is required",
  }),
  recipientName: z.string({ required_error: "recipientName is required" }),
  recipientEmail: z.string().email().optional().or(z.literal("")),
  recipientPhone: z.string().optional().or(z.literal("")),
  scheduledSendAt: z.string().optional().or(z.literal("")),
  message: z.string().max(250).optional().or(z.literal("")),
});

/**
 * @swagger
 * /api/virtual-shop/buy-gift-card:
 *   post:
 *     summary: Purchase a new gift card via the virtual shop Public API
 *     description: Creates an issued gift card and necessary ledger transaction. Handles mock checkout logic.
 *     tags:
 *       - Virtual Shop
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shopId
 *               - templateId
 *               - purchaseType
 *               - amount
 *               - purchaserName
 *               - purchaserEmail
 *               - isSendToMyself
 *               - deliveryMethod
 *               - recipientName
 *             properties:
 *               shopId:
 *                 type: integer
 *               templateId:
 *                 type: integer
 *               purchaseType:
 *                 type: string
 *                 enum: [INDIVIDUAL, MULTIPLE_RECIPIENTS, GROUP_GIFT]
 *               amount:
 *                 type: number
 *               promoCode:
 *                 type: string
 *               purchaserName:
 *                 type: string
 *               purchaserEmail:
 *                 type: string
 *               purchaserPhone:
 *                 type: string
 *               isSendToMyself:
 *                 type: boolean
 *               deliveryMethod:
 *                 type: string
 *                 enum: [EMAIL, SMS, BOTH]
 *               recipientName:
 *                 type: string
 *               recipientEmail:
 *                 type: string
 *               recipientPhone:
 *                 type: string
 *               scheduledSendAt:
 *                 type: string
 *                 format: date-time
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Gift card successfully purchased.
 *       400:
 *         description: Validation error or settings restriction.
 *       404:
 *         description: Shop or template not found.
 *       500:
 *         description: Internal Server Error.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const parsedData = buyGiftCardSchema.safeParse(body);
    if (!parsedData.success) {
      throw new AppError(400, parsedData.error.errors[0].message);
    }

    const {
      shopId,
      templateId,
      purchaseType,
      amount,
      promoCode,
      purchaserName,
      purchaserEmail,
      purchaserPhone,
      isSendToMyself,
      deliveryMethod,
      recipientName,
      recipientEmail,
      recipientPhone,
      scheduledSendAt,
      message,
    } = parsedData.data;

    // Validate delivery combinations
    if (!isSendToMyself) {
      if (deliveryMethod === DeliveryMethod.EMAIL && !recipientEmail) {
        throw new AppError(
          400,
          "Recipient email is required for EMAIL delivery",
        );
      }
      if (deliveryMethod === DeliveryMethod.SMS && !recipientPhone) {
        throw new AppError(400, "Recipient phone is required for SMS delivery");
      }
    }

    return await db.$transaction(async tx => {
      // 1. Fetch Shop and Company
      const shop = await tx.shop.findUnique({
        where: { id: shopId },
        include: {
          company: {
            select: { smsGateway: true, name: true },
          },
        },
      });

      if (!shop) {
        throw new AppError(404, "Shop not found");
      }

      // 2. Fetch GiftCardSetting
      const settings = await tx.giftCardSetting.findUnique({
        where: { companyId: shop.companyId },
      });

      if (!settings) {
        throw new AppError(
          404,
          "Gift card settings not found for this company",
        );
      }

      // Validate Amount against settings
      // Note: We check if it's a preset amount OR allowed custom amount
      const isCustomAllowed = settings.allowCustomAmount;
      const presets = settings.presetAmounts as number[] | null;

      let amountIsValid = false;
      if (presets && Array.isArray(presets) && presets.includes(amount)) {
        amountIsValid = true;
      } else if (isCustomAllowed) {
        const min = settings.minCustomAmount
          ? Number(settings.minCustomAmount)
          : 0;
        const max = settings.maxCustomAmount
          ? Number(settings.maxCustomAmount)
          : Infinity;
        if (amount >= min && amount <= max) {
          amountIsValid = true;
        }
      }

      if (!amountIsValid) {
        throw new AppError(
          400,
          "Invalid amount. Does not match presents or custom bounds.",
        );
      }

      // 3. Validate Template
      const template = await tx.giftCardTemplate.findUnique({
        where: { id: templateId },
      });

      if (
        !template ||
        template.companyId !== shop.companyId ||
        !template.isActive
      ) {
        throw new AppError(400, "Invalid or inactive gift card template");
      }

      // 4. Promo code logic
      let finalAmount = amount;
      if (promoCode) {
        const promo = await tx.giftCardPromo.findFirst({
          where: {
            companyId: shop.companyId,
            code: promoCode,
            isActive: true,
          },
        });

        if (!promo) {
          throw new AppError(400, "Invalid or inactive promo code");
        }

        if (promo.expireDate && new Date(promo.expireDate) < new Date()) {
          throw new AppError(400, "Promo code has expired");
        }

        if (promo.usageLimit && promo.timesUsed >= promo.usageLimit) {
          throw new AppError(400, "Promo code usage limit reached");
        }

        if (promo.type === "Percentage") {
          finalAmount = amount - amount * (Number(promo.value) / 100);
        } else if (promo.type === "Fixed") {
          finalAmount = amount - Number(promo.value);
        }

        if (finalAmount < 0) finalAmount = 0;

        // Apply promo usage
        await tx.giftCardPromo.update({
          where: { id: promo.id },
          data: { timesUsed: { increment: 1 } },
        });
      }

      // 5. Expiry Dates
      let expiresAt: Date | null = null;
      if (settings.defaultExpiryDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + settings.defaultExpiryDays);
      }

      // 6. Generate Card Code
      // Secure alphanumeric format (e.g., AWX-XXXX-XXXX)
      const generateCode = () =>
        `AWX-${nanoid(4).toUpperCase()}-${nanoid(4).toUpperCase()}`;
      let code = generateCode();

      // Ensure code is unique
      let codeExists = await tx.issuedGiftCard.findUnique({ where: { code } });
      while (codeExists) {
        code = generateCode();
        codeExists = await tx.issuedGiftCard.findUnique({ where: { code } });
      }

      // 7. Determine Final Delivery Fields
      const finalRecipientName = isSendToMyself ? purchaserName : recipientName;
      const finalRecipientEmail = isSendToMyself
        ? purchaserEmail
        : recipientEmail || null;
      const finalRecipientPhone = isSendToMyself
        ? purchaserPhone
        : recipientPhone || null;

      // 8. Create IssuedGiftCard
      const giftCard = await tx.issuedGiftCard.create({
        data: {
          companyId: shop.companyId,
          code,
          initialBalance: amount, // The original face value
          currentBalance: amount,
          // New enum field added to schema:
          purchaseType,
          purchaserName,
          purchaserEmail,
          recipientName: finalRecipientName,
          recipientEmail: finalRecipientEmail,
          recipientPhone: finalRecipientPhone,
          message: message || null,
          templateId,
          deliveryMethod,
          scheduledSendAt: scheduledSendAt ? new Date(scheduledSendAt) : null,
          expiresAt,
        },
      });

      // 9. Create Ledger Entry
      await tx.giftCardTransaction.create({
        data: {
          giftCardId: giftCard.id,
          type: TransactionType.ISSUE,
          amount: new Prisma.Decimal(amount), // Could be finalAmount, but ledger usually tracks face value for GiftCards
          balanceAfter: new Prisma.Decimal(amount),
          notes: promoCode
            ? `Purchased with promo code ${promoCode} (Cost: $${finalAmount.toFixed(2)})`
            : "Initial purchase",
        },
      });

      // Handle SMS Delivery
      if (
        (deliveryMethod === DeliveryMethod.SMS ||
          deliveryMethod === DeliveryMethod.BOTH) &&
        finalRecipientPhone
      ) {
        try {
          const firstName = finalRecipientName.split(" ")[0] || "Guest";
          const lastName =
            finalRecipientName.split(" ").slice(1).join(" ") || undefined;

          let recipientClient = await tx.client.findFirst({
            where: { mobile: finalRecipientPhone, companyId: shop.companyId },
          });

          if (!recipientClient) {
            const clientResult = await addCustomer({
              firstName,
              lastName,
              mobile: finalRecipientPhone,
              email: finalRecipientEmail || undefined,
              forceCompanyId: shop.companyId,
            });
            if (clientResult.type === "success" && clientResult.data) {
              recipientClient = clientResult.data as any; // Assert type safely
            }
          }

          if (recipientClient?.id) {
            const senderName = isSendToMyself ? "You" : purchaserName;
            const greeting = isSendToMyself
              ? "Here is your"
              : `Hi ${firstName}! ${senderName} just sent you a`;
            const smsMessage = message
              ? `${greeting} $${amount} Gift Card!\n\nMessage: "${message}"\n\nCode: ${code}\nValid at: ${shop.company?.name || "Our Shop"}`
              : `${greeting} $${amount} Gift Card!\n\nCode: ${code}\nValid at: ${shop.company?.name || "Our Shop"}`;

            const smsPayload = {
              companyId: shop.companyId,
              clientId: recipientClient.id,
              message: smsMessage,
              attachments: [],
              systemCall: true,
            };

            if (shop.company.smsGateway === "TWILIO") {
              await sendTwilioMessage(smsPayload);
            } else if (shop.company.smsGateway === "INFOBIP") {
              await sendInfobipMessage(smsPayload);
            }
          }
        } catch (smsError) {
          console.error("Failed to send gift card SMS:", smsError);
          // We do not fail the transaction if SMS fails, just log it.
        }
      } else if (
        (deliveryMethod === DeliveryMethod.EMAIL ||
          deliveryMethod === DeliveryMethod.BOTH) &&
        finalRecipientEmail
      ) {
        try {
          const firstName = finalRecipientName.split(" ")[0] || "Guest";
          const lastName =
            finalRecipientName.split(" ").slice(1).join(" ") || undefined;

          let recipientClient = await tx.client.findFirst({
            where: { email: finalRecipientEmail, companyId: shop.companyId },
          });

          if (!recipientClient) {
            const clientResult = await addCustomer({
              firstName,
              lastName,
              mobile: finalRecipientPhone || "",
              email: finalRecipientEmail,
              forceCompanyId: shop.companyId,
            });
            if (clientResult.type === "success" && clientResult.data) {
              recipientClient = clientResult.data as any; // Assert type safely
            }
          }

          if (recipientClient?.id) {
            const senderName = isSendToMyself ? "You" : purchaserName;
            const greeting = isSendToMyself
              ? "Here is your"
              : `Hi ${firstName}! ${senderName} just sent you a`;

            const emailText = message
              ? `${greeting} $${amount} Gift Card!\nMessage: "${message}"\nCode: ${code}\nValid at: ${shop.company?.name || "Our Shop"}`
              : `${greeting} $${amount} Gift Card!\nCode: ${code}\nValid at: ${shop.company?.name || "Our Shop"}`;

            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                  <div style="background-color: #2563eb; color: white; padding: 24px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">$${amount} Gift Card</h1>
                    <p style="margin: 8px 0 0; opacity: 0.9; font-weight: bold;">Valid at: ${shop.company?.name || "Our Shop"}</p>
                  </div>
                  <div style="padding: 32px 24px;">
                    <p style="font-size: 16px; color: #374151; margin-top: 0;">${greeting} Gift Card!</p>
                    ${message ? `<blockquote style="border-left: 4px solid #e5e7eb; padding-left: 16px; margin: 24px 0; color: #4b5563; font-style: italic;">"${message}"</blockquote>` : ""}
                    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 24px; text-align: center; margin: 32px 0;">
                      <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">Your Gift Card Code</p>
                      <p style="font-size: 28px; font-weight: bold; color: #111827; margin: 0; letter-spacing: 2px;">${code}</p>
                    </div>
                    <p style="font-size: 14px; color: #6b7280; margin: 0; text-align: center;">Present this code during checkout to redeem your gift.</p>
                  </div>
                </div>
              `;

            await sendInfobipEmail({
              clientId: recipientClient.id,
              subject: isSendToMyself
                ? `Your $${amount} Gift Card from ${shop.company?.name || "our shop"}`
                : `${purchaserName} sent you a $${amount} Gift Card!`,
              text: emailText,
              html: emailHtml,
            });
          }
        } catch (emailError) {
          console.error("Failed to send gift card Email:", emailError);
          // We do not fail the transaction if Email fails, just log it.
        }
      }

      // Masking the code for the frontend response
      // The frontend only needs the masked code so that they can show the user
      // the card was created and partially visible as proof of purchase,
      // without exposing the secure code which could be stolen from their screen.
      const maskedCode = `${code.split("-")[0]}-****-${code.split("-")[2]}`;

      return NextResponse.json(
        {
          success: true,
          message: "Purchase complete!",
          data: {
            confirmationNumber: `ORD-${nanoid(8).toUpperCase()}`,
            maskedCode,
            amount,
            recipientName: finalRecipientName,
            deliveryInfo: `${isSendToMyself ? "Self" : "Recipient"} • ${scheduledSendAt ? "Scheduled" : "Instant"}`,
          },
        },
        { status: 200 },
      );
    });
  } catch (error: any) {
    const formattedError = errorHandler(error);
    return NextResponse.json(
      {
        success: false,
        message: formattedError.message,
        errorDetails: formattedError,
      },
      { status: formattedError.statusCode },
    );
  }
}
