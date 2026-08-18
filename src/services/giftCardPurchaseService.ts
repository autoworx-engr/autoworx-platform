import { addCustomer } from "@/actions/client/add";
import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";
import { sendTwilioMessage } from "@/actions/communication/client/sendTwilioMessage";
import { sendInfobipEmail } from "@/actions/estimate/invoice/sendInfobipEmail";
import {
  generateGiftCardEmailHtml,
  generateGiftCardPurchaseReceiptEmailHtml,
} from "@/lib/emails-template/gift-card";
import { AppError } from "@/error-boundary/error";
import {
  DeliveryMethod,
  Prisma,
  TransactionType,
  GiftCardPurchaseType,
} from "@prisma/client";
import { type TransactionClient } from "@/lib/db";
import {
  normalizePhoneForStorage,
  phoneLookupWhereClause,
} from "@/utils/normalizePhone";
import { nanoid } from "nanoid";
import { z } from "zod";

export const giftCardPurchaseSchema = z.object({
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

export type GiftCardPurchaseInput = z.infer<typeof giftCardPurchaseSchema>;

type GiftCardPurchaseTx = TransactionClient;

interface ShopPurchaseContext {
  id: number;
  companyId: number;
  company: {
    smsGateway: string | null;
    name: string;
    paymentGateway: "STRIPE" | "AUTHORIZE_NET" | "BOTH";
    stripeAccountId: string | null;
    authorizeNetApiLoginId: string | null;
    authorizeNetTransactionKey: string | null;
    tipEnabled: boolean;
  };
}

interface GiftCardTemplateContext {
  id: number;
  shopId: number;
  companyId: number;
  isActive: boolean;
}

export interface GiftCardPurchaseContext {
  shop: ShopPurchaseContext;
  settings: {
    defaultExpiryDays: number | null;
  };
  template: GiftCardTemplateContext;
  finalAmount: number;
  promoId: number | null;
  finalRecipientName: string;
  finalRecipientEmail: string | null;
  finalRecipientPhone: string | null;
  scheduledSendAt: Date | null;
  expiresAt: Date | null;
}

export interface GiftCardPurchaseResult {
  confirmationNumber: string;
  maskedCode: string;
  amount: number;
  recipientName: string;
  deliveryInfo: string;
  giftCardId: number;
}

const roundMoney = (value: number) => Number(value.toFixed(2));

const parsePresetAmounts = (presetAmounts: unknown): number[] => {
  if (!Array.isArray(presetAmounts)) return [];
  return presetAmounts
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .map((value) => roundMoney(value));
};

export async function buildGiftCardPurchaseContext(
  tx: GiftCardPurchaseTx,
  input: GiftCardPurchaseInput,
): Promise<GiftCardPurchaseContext> {
  if (!input.isSendToMyself) {
    if (
      input.deliveryMethod === DeliveryMethod.EMAIL &&
      !input.recipientEmail
    ) {
      throw new AppError(400, "Recipient email is required for EMAIL delivery");
    }
    if (input.deliveryMethod === DeliveryMethod.SMS && !input.recipientPhone) {
      throw new AppError(400, "Recipient phone is required for SMS delivery");
    }
  }

  const shop = await tx.shop.findUnique({
    where: { id: input.shopId },
    include: {
      company: {
        select: {
          smsGateway: true,
          name: true,
          paymentGateway: true,
          stripeAccountId: true,
          authorizeNetApiLoginId: true,
          authorizeNetTransactionKey: true,
          tipEnabled: true,
        },
      },
    },
  });

  if (!shop) {
    throw new AppError(404, "Shop not found");
  }

  const settings = await tx.giftCardSetting.findUnique({
    where: { shopId: input.shopId },
    select: {
      allowCustomAmount: true,
      presetAmounts: true,
      minCustomAmount: true,
      maxCustomAmount: true,
      defaultExpiryDays: true,
    },
  });

  if (!settings) {
    throw new AppError(404, "Gift card settings not found for this shop");
  }

  const normalizedAmount = roundMoney(input.amount);
  const presets = parsePresetAmounts(settings.presetAmounts);

  let amountIsValid = presets.some(
    (presetAmount) => presetAmount === normalizedAmount,
  );

  if (!amountIsValid && settings.allowCustomAmount) {
    const min = settings.minCustomAmount ? Number(settings.minCustomAmount) : 0;
    const max = settings.maxCustomAmount
      ? Number(settings.maxCustomAmount)
      : Number.POSITIVE_INFINITY;
    amountIsValid = normalizedAmount >= min && normalizedAmount <= max;
  }

  if (!amountIsValid) {
    throw new AppError(
      400,
      "Invalid amount. Does not match presents or custom bounds.",
    );
  }

  const template = await tx.giftCardTemplate.findUnique({
    where: { id: input.templateId },
    select: {
      id: true,
      shopId: true,
      companyId: true,
      isActive: true,
    },
  });

  if (!template || template.shopId !== input.shopId || !template.isActive) {
    throw new AppError(400, "Invalid or inactive gift card template");
  }

  let finalAmount = normalizedAmount;
  let promoId: number | null = null;

  if (input.promoCode) {
    const promo = await tx.giftCardPromo.findFirst({
      where: {
        shopId: input.shopId,
        code: input.promoCode,
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
      finalAmount =
        normalizedAmount - normalizedAmount * (Number(promo.value) / 100);
    } else if (promo.type === "Fixed") {
      finalAmount = normalizedAmount - Number(promo.value);
    }

    promoId = promo.id;
  }

  finalAmount = roundMoney(Math.max(0, finalAmount));

  let expiresAt: Date | null = null;
  if (settings.defaultExpiryDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + settings.defaultExpiryDays);
  }

  const scheduledSendAt = input.scheduledSendAt
    ? new Date(input.scheduledSendAt)
    : null;

  if (scheduledSendAt && Number.isNaN(scheduledSendAt.getTime())) {
    throw new AppError(400, "Invalid scheduled send time");
  }

  return {
    shop,
    settings: {
      defaultExpiryDays: settings.defaultExpiryDays,
    },
    template,
    finalAmount,
    promoId,
    finalRecipientName: input.isSendToMyself
      ? input.purchaserName
      : input.recipientName,
    finalRecipientEmail: input.isSendToMyself
      ? input.purchaserEmail
      : input.recipientEmail || null,
    finalRecipientPhone: input.isSendToMyself
      ? input.purchaserPhone || null
      : input.recipientPhone || null,
    scheduledSendAt,
    expiresAt,
  };
}

const generateOrderNumber = () => `ORD-${nanoid(8).toUpperCase()}`;
const generateGiftCardCode = () =>
  `AWX-${nanoid(4).toUpperCase()}-${nanoid(4).toUpperCase()}`;

async function getUniqueOrderNumber(tx: GiftCardPurchaseTx): Promise<string> {
  let orderNumber = generateOrderNumber();
  let exists = await tx.issuedGiftCard.findFirst({
    where: { orderNumber },
    select: { id: true },
  });

  while (exists) {
    orderNumber = generateOrderNumber();
    exists = await tx.issuedGiftCard.findFirst({
      where: { orderNumber },
      select: { id: true },
    });
  }

  return orderNumber;
}

async function getUniqueGiftCardCode(tx: GiftCardPurchaseTx): Promise<string> {
  let code = generateGiftCardCode();
  let exists = await tx.issuedGiftCard.findUnique({
    where: { code },
    select: { id: true },
  });

  while (exists) {
    code = generateGiftCardCode();
    exists = await tx.issuedGiftCard.findUnique({
      where: { code },
      select: { id: true },
    });
  }

  return code;
}

async function sendGiftCardNotifications(
  tx: GiftCardPurchaseTx,
  input: GiftCardPurchaseInput,
  context: GiftCardPurchaseContext,
  giftCardCode: string,
): Promise<void> {
  const deliveryMethod = input.deliveryMethod as DeliveryMethod;
  const { finalRecipientName, finalRecipientEmail, finalRecipientPhone } =
    context;

  if (
    (deliveryMethod === DeliveryMethod.SMS ||
      deliveryMethod === DeliveryMethod.BOTH) &&
    finalRecipientPhone
  ) {
    try {
      const firstName = finalRecipientName.split(" ")[0] || "Guest";
      const lastName =
        finalRecipientName.split(" ").slice(1).join(" ") || undefined;

      const recipientPhoneLookup = phoneLookupWhereClause(finalRecipientPhone);
      let recipientClient = recipientPhoneLookup
        ? await tx.client.findFirst({
            where: {
              OR: recipientPhoneLookup,
              companyId: context.shop.companyId,
            },
          })
        : null;

      if (!recipientClient) {
        const clientResult = await addCustomer({
          firstName,
          lastName,
          mobile: finalRecipientPhone,
          email: finalRecipientEmail || undefined,
          forceCompanyId: context.shop.companyId,
        });
        if (clientResult.type === "success" && clientResult.data) {
          recipientClient = clientResult.data as any;
        }
      }

      if (recipientClient?.id) {
        const senderName = input.isSendToMyself ? "You" : input.purchaserName;
        const greeting = input.isSendToMyself
          ? "Here is your"
          : `Hi ${firstName}! ${senderName} just sent you a`;

        const smsMessage = input.message
          ? `${greeting} $${input.amount} Gift Card!\n\nMessage: "${input.message}"\n\nCode: ${giftCardCode}\nValid at: ${context.shop.company.name || "Our Shop"}`
          : `${greeting} $${input.amount} Gift Card!\n\nCode: ${giftCardCode}\nValid at: ${context.shop.company.name || "Our Shop"}`;

        const smsPayload = {
          companyId: context.shop.companyId,
          clientId: recipientClient.id,
          message: smsMessage,
          attachments: [],
          systemCall: true,
        };

        if (context.shop.company.smsGateway === "TWILIO") {
          await sendTwilioMessage(smsPayload);
        } else if (context.shop.company.smsGateway === "INFOBIP") {
          await sendInfobipMessage(smsPayload);
        }
      }
    } catch (smsError) {
      // eslint-disable-next-line no-console
      console.error("Failed to send gift card SMS:", smsError);
    }
  }

  if (
    (deliveryMethod === DeliveryMethod.EMAIL ||
      deliveryMethod === DeliveryMethod.BOTH) &&
    finalRecipientEmail
  ) {
    try {
      const firstName = finalRecipientName.split(" ")[0] || "Guest";
      const lastName =
        finalRecipientName.split(" ").slice(1).join(" ") || undefined;

      let recipientClient = await tx.client.findFirst({
        where: {
          email: finalRecipientEmail,
          companyId: context.shop.companyId,
        },
      });

      if (!recipientClient) {
        const clientResult = await addCustomer({
          firstName,
          lastName,
          mobile: finalRecipientPhone || "",
          email: finalRecipientEmail,
          forceCompanyId: context.shop.companyId,
        });
        if (clientResult.type === "success" && clientResult.data) {
          recipientClient = clientResult.data as any;
        }
      }

      if (recipientClient?.id) {
        const senderName = input.isSendToMyself ? "You" : input.purchaserName;
        const greeting = input.isSendToMyself
          ? "Here is your"
          : `Hi ${firstName}! ${senderName} just sent you a`;

        const emailText = input.message
          ? `${greeting} $${input.amount} Gift Card!\nMessage: "${input.message}"\nCode: ${giftCardCode}\nValid at: ${context.shop.company.name || "Our Shop"}`
          : `${greeting} $${input.amount} Gift Card!\nCode: ${giftCardCode}\nValid at: ${context.shop.company.name || "Our Shop"}`;

        const emailHtml = generateGiftCardEmailHtml({
          amount: input.amount,
          shopName: context.shop.company.name || "Our Shop",
          greeting,
          message: input.message,
          giftCardCode,
        });

        await sendInfobipEmail({
          clientId: recipientClient.id,
          subject: input.isSendToMyself
            ? `Your $${input.amount} Gift Card from ${context.shop.company.name || "our shop"}`
            : `${input.purchaserName} sent you a $${input.amount} Gift Card!`,
          text: emailText,
          html: emailHtml,
        });
      }
    } catch (emailError) {
      // eslint-disable-next-line no-console
      console.error("Failed to send gift card Email:", emailError);
    }
  }
}

interface IssueGiftCardOptions {
  referenceId?: string;
}

const splitFullName = (fullName: string) => {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return {
    firstName: firstName || "Guest",
    lastName: rest.join(" ") || undefined,
  };
};

async function ensurePurchaserClientRecord(
  tx: GiftCardPurchaseTx,
  input: GiftCardPurchaseInput,
  companyId: number,
) {
  const purchaserEmail = input.purchaserEmail?.trim() || undefined;
  const purchaserMobile = input.purchaserPhone?.trim() || undefined;

  let existingClient = purchaserEmail
    ? await tx.client.findFirst({
        where: {
          companyId,
          email: purchaserEmail,
        },
      })
    : null;

  const purchaserPhoneLookup = phoneLookupWhereClause(purchaserMobile);
  if (!existingClient && purchaserPhoneLookup) {
    existingClient = await tx.client.findFirst({
      where: {
        companyId,
        OR: purchaserPhoneLookup,
      },
    });
  }

  if (existingClient) {
    return existingClient;
  }

  const { firstName, lastName } = splitFullName(input.purchaserName);

  return tx.client.create({
    data: {
      companyId,
      firstName,
      lastName,
      email: purchaserEmail,
      mobile: purchaserMobile
        ? normalizePhoneForStorage(purchaserMobile)
        : purchaserMobile,
      isSalesAgent: true,
    },
  });
}

const extractPaymentIdFromReference = (referenceId?: string) => {
  if (!referenceId || !referenceId.startsWith("PAYMENT-")) {
    return null;
  }

  const numericPart = Number(referenceId.replace("PAYMENT-", ""));
  if (!Number.isInteger(numericPart) || numericPart <= 0) {
    return null;
  }

  return numericPart;
};

export async function issueGiftCardFromContext(
  tx: GiftCardPurchaseTx,
  input: GiftCardPurchaseInput,
  context: GiftCardPurchaseContext,
  options: IssueGiftCardOptions = {},
): Promise<GiftCardPurchaseResult> {
  if (context.promoId) {
    await tx.giftCardPromo.update({
      where: { id: context.promoId },
      data: { timesUsed: { increment: 1 } },
    });
  }

  const orderNumber = await getUniqueOrderNumber(tx);
  const code = await getUniqueGiftCardCode(tx);

  const giftCard = await tx.issuedGiftCard.create({
    data: {
      companyId: context.shop.companyId,
      shopId: context.shop.id,
      code,
      orderNumber,
      initialBalance: input.amount,
      currentBalance: input.amount,
      purchaseType: input.purchaseType as GiftCardPurchaseType,
      purchaserName: input.purchaserName,
      purchaserEmail: input.purchaserEmail,
      recipientName: context.finalRecipientName,
      recipientEmail: context.finalRecipientEmail,
      recipientPhone: context.finalRecipientPhone,
      message: input.message || null,
      templateId: input.templateId,
      deliveryMethod: input.deliveryMethod as DeliveryMethod,
      scheduledSendAt: context.scheduledSendAt,
      expiresAt: context.expiresAt,
    },
  });

  const purchaseNotes = input.promoCode
    ? `Purchased with promo code ${input.promoCode} (Cost: $${context.finalAmount.toFixed(2)})`
    : "Initial purchase";

  const purchaserClient = await ensurePurchaserClientRecord(
    tx,
    input,
    context.shop.companyId,
  );

  const paymentId = extractPaymentIdFromReference(options.referenceId);
  if (paymentId) {
    const existingPayment = await tx.payment.findFirst({
      where: {
        id: paymentId,
        companyId: context.shop.companyId,
      },
      select: {
        notes: true,
      },
    });

    if (existingPayment) {
      let parsedNotes: Record<string, any> = {};

      if (existingPayment.notes) {
        try {
          parsedNotes = JSON.parse(existingPayment.notes);
        } catch {
          parsedNotes = {};
        }
      }

      await tx.payment.update({
        where: {
          id: paymentId,
        },
        data: {
          notes: JSON.stringify({
            ...parsedNotes,
            source: "virtual_shop_gift_card",
            purchaserName: input.purchaserName,
            purchaserClientId: purchaserClient.id,
            giftCardId: giftCard.id,
            giftCardOrderNumber: orderNumber,
          }),
        },
      });
    }
  }

  await tx.giftCardTransaction.create({
    data: {
      giftCardId: giftCard.id,
      type: TransactionType.ISSUE,
      amount: new Prisma.Decimal(input.amount),
      balanceAfter: new Prisma.Decimal(input.amount),
      referenceId: options.referenceId || null,
      notes: purchaseNotes,
    },
  });

  await sendGiftCardNotifications(tx, input, context, code);

  const maskedCode = `${code.split("-")[0]}-****-${code.split("-")[2]}`;

  // Recipient notifications above cover the "here's your gift card" case.
  // When gifting to someone else, the purchaser is charged but otherwise
  // gets no record of the transaction unless they stay on the confirmation
  // screen — send them a receipt too (email always, SMS if they gave a
  // phone number), mirroring how the recipient notification covers both.
  if (!input.isSendToMyself && purchaserClient?.id) {
    const shopDisplayName = context.shop.company.name || "our shop";

    try {
      await sendInfobipEmail({
        clientId: purchaserClient.id,
        subject: `Your gift card purchase at ${shopDisplayName} is confirmed`,
        text: `Purchase Complete!\nConfirmation #: ${orderNumber}\nGift Card: ${maskedCode}\nAmount: $${input.amount}\nRecipient: ${context.finalRecipientName}\nDelivery: ${input.deliveryMethod}`,
        html: generateGiftCardPurchaseReceiptEmailHtml({
          confirmationNumber: orderNumber,
          maskedCode,
          amount: input.amount,
          shopName: shopDisplayName,
          recipientName: context.finalRecipientName,
          deliveryMethod: input.deliveryMethod,
        }),
      });
    } catch (receiptError) {
      // eslint-disable-next-line no-console
      console.error(
        "Failed to send gift card purchase receipt email:",
        receiptError,
      );
    }

    const purchaserPhone = input.purchaserPhone?.trim();
    if (purchaserPhone) {
      try {
        const smsPayload = {
          companyId: context.shop.companyId,
          clientId: purchaserClient.id,
          message: `Purchase Complete! Your $${input.amount} gift card for ${context.finalRecipientName} at ${shopDisplayName} is confirmed.\nConfirmation #: ${orderNumber}\nCard: ${maskedCode}`,
          attachments: [],
          systemCall: true,
        };

        if (context.shop.company.smsGateway === "TWILIO") {
          await sendTwilioMessage(smsPayload);
        } else if (context.shop.company.smsGateway === "INFOBIP") {
          await sendInfobipMessage(smsPayload);
        }
      } catch (receiptSmsError) {
        // eslint-disable-next-line no-console
        console.error(
          "Failed to send gift card purchase receipt SMS:",
          receiptSmsError,
        );
      }
    }
  }

  return {
    giftCardId: giftCard.id,
    confirmationNumber: orderNumber,
    maskedCode,
    amount: input.amount,
    recipientName: context.finalRecipientName,
    deliveryInfo: `${input.isSendToMyself ? "Self" : "Recipient"} • ${context.scheduledSendAt ? "Scheduled" : "Instant"}`,
  };
}
