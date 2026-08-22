import { db, type TransactionClient } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { createInvoice } from "@/actions/estimate/invoice/create";
import { addAppointment } from "@/actions/appointment/addAppointment";
import { customAlphabet } from "nanoid";
import moment from "moment-timezone";
import { sendBookingConfirmation } from "@/actions/communication/client/sendBookingConfirmation";
import { revalidatePath } from "next/cache";
import {
  buildInvoiceItemsWithDefaults,
  mapInvoiceItemsForCreate,
} from "@/services/shopServiceInvoiceItems";

const roundMoney = (value: number) => Number(value.toFixed(2));

type Tx = TransactionClient;

export interface ConfirmBookingParams {
  shopBookingId: number | string;
  cashPaid: number;
  giftCardCode?: string;
}

export interface ConfirmBookingResult {
  invoiceId: string;
  appointmentId: number;
  shopBookingId: number;
  status: string;
  giftCardAmount?: number;
  remainingGiftCardBalance?: number;
}

/**
 * Confirms a pending shop booking by creating the invoice + appointment,
 * optionally redeeming a gift card, and updating the booking status.
 *
 * Called by:
 * - Stripe webhook (cash-only deposit)
 * - AuthorizeNet webhook (cash-only deposit)
 * - apply-gift-card route (gift card + optional cash)
 */
export async function confirmShopBooking(
  params: ConfirmBookingParams,
): Promise<ConfirmBookingResult> {
  const {
    shopBookingId,
    cashPaid,
    giftCardCode: explicitGiftCardCode,
  } = params;
  const bookingId = Number(shopBookingId);
  const incomingCash = roundMoney(Math.max(0, Number(cashPaid)));

  let pendingConfirmation:
    | Parameters<typeof sendBookingConfirmation>[0]
    | null = null;

  const result = await db.$transaction(async (tx: Tx) => {
    // 1. Load the booking with all relations
    const booking = await tx.shopBooking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        shop: {
          include: {
            bookingSettings: {
              include: { availabilities: true },
            },
            company: {
              select: {
                name: true,
                smsGateway: true,
                terms: true,
                policy: true,
                tax: true,
                serviceFee: true,
              },
            },
          },
        },
        appointment: true,
        vehicle: true,
        services: true,
        invoice: true,
      },
    });

    if (!booking) {
      throw new Error("Shop booking not found");
    }

    // Resolve gift card code: explicit param takes priority, else use stored one
    const giftCardCode =
      explicitGiftCardCode || (booking as any).pendingGiftCardCode || undefined;

    // If already confirmed with an invoice, handle late gift card redemption
    if (booking.status === "CONFIRMED" && booking.invoiceId) {
      // If a gift card was requested but not yet applied (discount is 0),
      // redeem it against the existing invoice (handles webhook-before-client race)
      if (giftCardCode && Number(booking.invoice?.discount || 0) === 0) {
        const normalizedCode = giftCardCode.trim().toUpperCase();
        const giftCard = await tx.issuedGiftCard.findFirst({
          where: { code: normalizedCode, companyId: booking.shop.companyId },
          select: { id: true, status: true, currentBalance: true },
        });

        if (giftCard && giftCard.status === "ACTIVE") {
          const availBal = roundMoney(Number(giftCard.currentBalance || 0));
          const depReq = roundMoney(Number(booking.depositRequired || 0));
          const remaining = roundMoney(Math.max(0, depReq - incomingCash));
          const gcAmt = roundMoney(Math.min(availBal, remaining));

          if (gcAmt > 0) {
            const newBal = roundMoney(availBal - gcAmt);
            await tx.issuedGiftCard.updateMany({
              where: {
                id: giftCard.id,
                currentBalance: { gte: new Prisma.Decimal(gcAmt) },
              },
              data: {
                currentBalance: new Prisma.Decimal(newBal),
                status: newBal <= 0 ? "DEPLETED" : "ACTIVE",
              },
            });
            await tx.giftCardTransaction.create({
              data: {
                giftCardId: giftCard.id,
                type: "REDEMPTION",
                amount: new Prisma.Decimal(-gcAmt),
                balanceAfter: new Prisma.Decimal(newBal),
                referenceId: `SHOP-BOOKING-${booking.id}`,
                notes: "Redeemed at booking deposit confirmation (late)",
              },
            });

            const origGT = roundMoney(Number(booking.invoice?.grandTotal || 0));
            const newGT = roundMoney(origGT - gcAmt);
            const existingDeposit = roundMoney(
              Number(booking.invoice?.deposit || 0),
            );
            await tx.invoice.update({
              where: { id: booking.invoiceId },
              data: {
                discount: gcAmt,
                grandTotal: newGT,
                due: Math.max(0, roundMoney(newGT - existingDeposit)),
              },
            });
          }
        }
      }

      return {
        invoiceId: booking.invoiceId,
        appointmentId: booking.appointmentId!,
        shopBookingId: booking.id,
        status: "CONFIRMED",
      };
    }

    const companyId = booking.shop.companyId;
    const bookingSettings = booking.shop.bookingSettings;

    if (!bookingSettings) {
      throw new Error("Shop booking settings not found");
    }

    // 2. Load full ShopService data (with invoiceItems) for estimate creation
    const shopServiceIds = booking.services
      .map((s) => s.shopServiceId)
      .filter((id): id is number => id !== null);

    const selectedServices = await tx.shopService.findMany({
      where: { id: { in: shopServiceIds }, shopId: booking.shopId },
      include: {
        invoiceItems: {
          include: {
            service: true,
            materials: {
              include: { tags: { include: { tag: true } } },
            },
            labor: {
              include: { tags: { include: { tag: true } } },
            },
            tags: { include: { tag: true } },
          },
        },
      },
    });

    // 3. Build invoice items — every item must reference a valid Service;
    // shop services without invoice items get a default Service
    let allInvoiceItems = await buildInvoiceItemsWithDefaults(
      selectedServices,
      companyId,
    );

    // Shop services deleted since booking: fall back to snapshot titles
    if (allInvoiceItems.length === 0) {
      allInvoiceItems = await buildInvoiceItemsWithDefaults(
        booking.services.map((s) => ({ title: s.title, invoiceItems: [] })),
        companyId,
      );
    }

    if (allInvoiceItems.length === 0) {
      throw new Error(
        "Cannot create an invoice without at least one service item",
      );
    }

    const items = mapInvoiceItemsForCreate(allInvoiceItems);

    // 4. Calculate totals from ShopBookingService snapshots
    const vehicleExtraCost = booking.services.reduce(
      (acc, srv) => acc + Number(srv.modifierPrice || 0),
      0,
    );
    const totalServiceCost = booking.services.reduce(
      (acc, srv) => acc + Number(srv.price || 0),
      0,
    );
    const subtotal = totalServiceCost + vehicleExtraCost;

    const taxRate = bookingSettings.isTaxEnabled
      ? Number(booking.shop.company.tax)
      : 0;
    const serviceFeeRate = bookingSettings.isServiceFeeEnabled
      ? Number(booking.shop.company.serviceFee)
      : 0;

    const taxAmount = (subtotal * taxRate) / 100;
    const serviceFeeAmount = (subtotal * serviceFeeRate) / 100;

    // 5. Gift card processing (if provided)
    let giftCardAmount = 0;
    let remainingGiftCardBalance: number | undefined;

    if (giftCardCode) {
      const normalizedCode = giftCardCode.trim().toUpperCase();
      const giftCard = await tx.issuedGiftCard.findFirst({
        where: { code: normalizedCode, companyId },
        select: {
          id: true,
          code: true,
          status: true,
          currentBalance: true,
        },
      });

      if (!giftCard) throw new Error("Gift card not found");
      if (giftCard.status !== "ACTIVE") {
        throw new Error(
          `Cannot redeem a ${giftCard.status.toLowerCase()} gift card`,
        );
      }

      const availableBalance = roundMoney(Number(giftCard.currentBalance || 0));
      if (availableBalance <= 0) {
        throw new Error("Gift card has no balance to redeem");
      }

      // Gift card covers what's left of the deposit after cash
      const depositRequired = roundMoney(Number(booking.depositRequired || 0));
      const remainingAfterCash = roundMoney(
        Math.max(0, depositRequired - incomingCash),
      );
      giftCardAmount = roundMoney(
        Math.min(availableBalance, remainingAfterCash),
      );

      if (giftCardAmount > 0) {
        const newBalance = roundMoney(availableBalance - giftCardAmount);
        const updateResult = await tx.issuedGiftCard.updateMany({
          where: {
            id: giftCard.id,
            companyId,
            currentBalance: { gte: new Prisma.Decimal(giftCardAmount) },
          },
          data: {
            currentBalance: new Prisma.Decimal(newBalance),
            status: newBalance <= 0 ? "DEPLETED" : "ACTIVE",
          },
        });

        if (updateResult.count === 0) {
          throw new Error(
            "Gift card balance changed while processing. Please retry.",
          );
        }

        await tx.giftCardTransaction.create({
          data: {
            giftCardId: giftCard.id,
            type: "REDEMPTION",
            amount: new Prisma.Decimal(-giftCardAmount),
            balanceAfter: new Prisma.Decimal(newBalance),
            referenceId: `SHOP-BOOKING-${bookingId}`,
            notes: "Redeemed at booking deposit confirmation",
          },
        });

        remainingGiftCardBalance = newBalance;
      }
    }

    // 6. Compute final totals
    const adjustedGrandTotal = roundMoney(
      subtotal + taxAmount + serviceFeeAmount - giftCardAmount,
    );
    const due = roundMoney(Math.max(0, adjustedGrandTotal - incomingCash));

    // 7. Create the Estimate / Invoice
    const estimateId = customAlphabet("1234567890", 10)();

    const findCompanyAdminUser = await tx.user.findFirst({
      where: { companyId, employeeType: "Admin" },
    });

    if (!findCompanyAdminUser) {
      throw new Error("Company admin not found for the provided shop.");
    }

    const estimateResult = await createInvoice({
      invoiceId: estimateId,
      type: "Estimate",
      clientId: booking.clientId ?? undefined,
      vehicleId: booking.vehicleId ?? undefined,
      subtotal,
      discount: giftCardAmount,
      tax: taxRate,
      serviceFee: serviceFeeRate,
      vehicleExtraCost,
      deposit: incomingCash,
      depositNotes: incomingCash > 0 ? "Deposit via payment gateway" : "",
      depositMethod: incomingCash > 0 ? "Online" : "",
      grandTotal: adjustedGrandTotal,
      due,
      internalNotes: "",
      terms: booking.shop.company.terms || "",
      policy: booking.shop.company.policy || "",
      customerNotes: booking.customerNotes || "",
      customerComments: "",
      photos: [],
      items,
      tasks: [],
      inspections: [],
      damageNotes: "",
      forceCompanyId: companyId,
      isShopBooking: true,
    });

    if (estimateResult.type !== "success" || !estimateResult.data) {
      throw new Error(
        estimateResult.type === "globalError" || estimateResult.type === "error"
          ? estimateResult.message
          : "Failed to create estimate",
      );
    }

    const estimate = estimateResult.data;

    // Mark lead as estimate created
    if (booking.client?.leadId) {
      await tx.lead.update({
        where: { id: booking.client.leadId },
        data: { isEstimateCreated: true },
      });
    }

    // 8. Create the Appointment
    const appointmentDate =
      booking.appointmentDate || moment().format("YYYY-MM-DD");
    const appointmentStartTime = booking.appointmentTime || "09:00";
    const slotInterval = bookingSettings.slotInterval;
    const endTime = moment(appointmentStartTime, "HH:mm")
      .add(slotInterval, "minutes")
      .format("HH:mm");

    const vehicleLabel = booking.vehicle
      ? `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`
      : "Vehicle";
    const clientLabel = booking.client
      ? `${booking.client.firstName} ${booking.client.lastName || ""}`.trim()
      : "Guest";

    const appointmentResult = await addAppointment({
      title: `${vehicleLabel} - ${clientLabel}`,
      date: appointmentDate,
      startTime: appointmentStartTime,
      endTime,
      clientId: booking.clientId ?? undefined,
      vehicleId: booking.vehicleId ?? undefined,
      notes: booking.customerNotes || undefined,
      draftEstimate: estimate.id,
      timezone: "UTC",
      assignedUsers: [findCompanyAdminUser.id],
      forceCompanyId: companyId,
      forceUserId: findCompanyAdminUser.id,
    });

    if (appointmentResult.type !== "success" || !appointmentResult.data) {
      throw new Error(
        appointmentResult.type === "globalError" ||
          appointmentResult.type === "error"
          ? appointmentResult.message
          : "Failed to create appointment",
      );
    }

    const appointment = appointmentResult.data;

    // 9. Update the ShopBooking (clear pendingGiftCardCode to prevent double redemption)
    await tx.shopBooking.update({
      where: { id: booking.id },
      data: {
        invoiceId: estimate.id,
        appointmentId: appointment.id,
        status: "CONFIRMED",
        pendingGiftCardCode: null,
      } as any,
    });

    // 10. Capture confirmation data — sent after transaction commits
    pendingConfirmation = {
      client: {
        id: booking.client!.id,
        firstName: booking.client!.firstName,
        email: booking.client?.email,
        mobile: booking.client?.mobile,
      },
      shop: {
        companyId: booking.shop.companyId,
        company: booking.shop.company,
      },
      appointment: {
        date: appointmentDate,
        startTime: appointmentStartTime,
      },
      vehicle: booking.vehicle
        ? {
            year: booking.vehicle.year,
            make: booking.vehicle.make,
            model: booking.vehicle.model,
          }
        : null,
      services: booking.services?.map((s) => ({ title: s.title })) || null,
      isDeposit: true,
    };

    return {
      invoiceId: estimate.id,
      appointmentId: appointment.id,
      shopBookingId: booking.id,
      status: "CONFIRMED",
      giftCardAmount: giftCardAmount > 0 ? giftCardAmount : undefined,
      remainingGiftCardBalance,
    };
  });

  // Send after transaction commits — failure here must NOT cause a retry
  if (pendingConfirmation) {
    sendBookingConfirmation(pendingConfirmation).catch((e) =>
      console.error("[confirmShopBooking] sendBookingConfirmation failed:", e),
    );
  }

  // Revalidate after the transaction so it runs in the outer request context,
  // not inside the Prisma transaction boundary where Next.js async storage is lost.
  try {
    revalidatePath("/estimate");
  } catch {
    // no-op: best-effort when called from webhook context
  }

  return result;
}
