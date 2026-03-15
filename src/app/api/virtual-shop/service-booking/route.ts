import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import moment from "moment-timezone";
import { createInvoice } from "@/actions/estimate/invoice/create";
import { addCustomer } from "@/actions/client/add";
import { customAlphabet } from "nanoid";
import { addVehicle } from "@/actions/vehicle/addVehicle";
import { addAppointment } from "@/actions/appointment/addAppointment";
import { AppError } from "@/error-boundary/error";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      slug,
      shopServiceIds,
      appointmentDate,
      appointmentStartTime,
      fullName,
      email,
      phone,
      make,
      model,
      year,
      notes,
    } = body;

    // 1. Validate required input
    if (
      !slug ||
      !shopServiceIds ||
      !Array.isArray(shopServiceIds) ||
      shopServiceIds.length === 0 ||
      !appointmentDate ||
      !appointmentStartTime ||
      !phone ||
      !make ||
      !model ||
      !year
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    const firstName = fullName?.split(" ")[0] || "Guest";
    const lastName = fullName?.split(" ").slice(1).join(" ") || undefined;

    return await db.$transaction(async tx => {
      // 2. Validate Shop Slug
      const shop = await tx.shop.findUnique({
        where: { slug },
        include: {
          company: {
            select: {
              terms: true,
              policy: true,
              tax: true,
              serviceFee: true,
            },
          },
        },
      });

      if (!shop) {
        throw new AppError(404, "Shop not found with the provided slug.");
      }

      const findCompanyAdminUser = await tx.user.findFirst({
        where: {
          companyId: shop?.companyId,
          employeeType: "Admin",
        },
      });

      if (!findCompanyAdminUser) {
        throw new AppError(
          404,
          "Company admin not found for the provided shop.",
        );
      }

      const companyId = shop.companyId;

      // 3. Find or Create Client
      let client = await tx.client.findFirst({
        where: {
          mobile: phone,
          companyId,
        },
      });

      if (!client) {
        const clientResult = await addCustomer({
          firstName,
          lastName,
          mobile: phone,
          email,
          forceCompanyId: companyId,
        });

        if (clientResult.type !== "success" || !clientResult.data) {
          throw new AppError(
            400,
            clientResult.type === "globalError" || clientResult.type === "error"
              ? clientResult.message
              : "Failed to create customer via shared action",
          );
        }
        client = clientResult.data;
      }

      // 4. Find or Create Vehicle
      let vehicle = await tx.vehicle.findFirst({
        where: {
          clientId: client?.id,
          year: parseInt(year),
          make,
          model,
          companyId,
        },
      });

      if (!vehicle) {
        const vehicleResponse = await addVehicle({
          year: parseInt(year),
          make,
          model,
          submodel: "",
          type: "",
          transmission: "",
          engineSize: "",
          license: "",
          vin: "",
          notes: "",
          other: "",
          clientId: client?.id!,
          forceCompanyId: companyId,
        });
        if (vehicleResponse.type === "success") {
          vehicle = vehicleResponse.data;
        }
      }

      // 5. Find ShopBookingSetting & check Availability
      const bookingSettings = await tx.shopBookingSetting.findUnique({
        where: { shopId: shop.id },
        include: { availabilities: true },
      });

      if (!bookingSettings) {
        throw new AppError(404, "Shop booking settings not found.");
      }

      const dayOfWeekKey = moment(appointmentDate)
        .format("dddd")
        .toUpperCase() as
        | "MONDAY"
        | "TUESDAY"
        | "WEDNESDAY"
        | "THURSDAY"
        | "FRIDAY"
        | "SATURDAY"
        | "SUNDAY";

      const availability = bookingSettings.availabilities.find(
        a => a.dayOfWeek === dayOfWeekKey,
      );

      if (!availability || !availability.isOpen) {
        throw new AppError(
          400,
          `Shop is not open on ${dayOfWeekKey.toLowerCase()}s.`,
        );
      }

      // Validate time bounds
      if (availability.startTime && availability.endTime) {
        const reqTime = moment(appointmentStartTime, "HH:mm");
        const shopStart = moment(availability.startTime, "HH:mm");
        const shopEnd = moment(availability.endTime, "HH:mm");

        if (reqTime.isBefore(shopStart) || reqTime.isAfter(shopEnd)) {
          throw new AppError(
            400,
            `Appointment time must be between ${availability.startTime} and ${availability.endTime}.`,
          );
        }
      }

      // 6. Check Capacity (Stacking context)
      // Check existing appointments for this exact slot
      const existingAppointmentsCount = await tx.appointment.count({
        where: {
          companyId,
          date: new Date(appointmentDate),
          startTime: appointmentStartTime,
        },
      });

      if (
        bookingSettings.isStackingEnabled &&
        existingAppointmentsCount >= bookingSettings.stackingLimit
      ) {
        throw new AppError(
          400,
          `No available slots for ${appointmentDate} at ${appointmentStartTime}. Limit reached.`,
        );
      } else if (
        !bookingSettings.isStackingEnabled &&
        existingAppointmentsCount > 0
      ) {
        throw new AppError(
          400,
          `No available slots for ${appointmentDate} at ${appointmentStartTime}. Slot is already booked.`,
        );
      }

      // 7. Retrieve Service Invoice Items & Calculate Totals
      const selectedServices = await tx.shopService.findMany({
        where: {
          id: { in: shopServiceIds },
          shopId: shop.id,
        },
        include: {
          invoiceItems: {
            include: {
              service: true,
              materials: {
                include: {
                  tags: {
                    include: {
                      tag: true,
                    },
                  },
                },
              },
              labor: {
                include: {
                  tags: {
                    include: {
                      tag: true,
                    },
                  },
                },
              },
              tags: {
                include: {
                  tag: true,
                },
              },
            },
          },
        },
      });

      if (selectedServices.length === 0) {
        throw new AppError(400, "No valid services selected for this shop.");
      }

      const allInvoiceItems = selectedServices.flatMap(srv => {
        return srv.invoiceItems;
      });

      const items = allInvoiceItems.map(({ id, ...item }) => ({
        ...item,
        materials: item.materials.map(material => ({
          ...material,
          tags: material.tags.map((mt: any) => mt.tag),
        })),
        labor: item.labor
          ? {
              ...item.labor,
              tags: item.labor.tags.map((lt: any) => lt.tag),
            }
          : null,
        tags: item.tags.map((it: any) => it.tag),
      }));

      let subtotal = selectedServices.reduce(
        (acc, cur) => acc + Number(cur.price),
        0,
      );

      const estimateId = customAlphabet("1234567890", 10)();

      const taxRate = bookingSettings.isTaxEnabled
        ? Number(shop.company.tax)
        : 0;
      const serviceFeeRate = bookingSettings.isServiceFeeEnabled
        ? Number(shop.company.serviceFee)
        : 0;

      const taxAmount = (subtotal * taxRate) / 100;
      const serviceFeeAmount = (subtotal * serviceFeeRate) / 100;
      const grandTotal = subtotal + taxAmount + serviceFeeAmount;

      // 8. Create Estimate using the refactored shared action
      const estimateResult = await createInvoice({
        invoiceId: estimateId,
        type: "Estimate",
        clientId: client?.id,
        vehicleId: vehicle?.id,
        subtotal,
        discount: 0,
        tax: taxAmount,
        serviceFee: serviceFeeAmount,
        deposit: 0,
        depositNotes: "",
        depositMethod: "",
        grandTotal,
        due: grandTotal,
        internalNotes: "",
        terms: shop.company.terms || "",
        policy: shop.company.policy || "",
        customerNotes: notes || "",
        customerComments: "",
        photos: [],
        items,
        tasks: [],
        inspections: [],
        damageNotes: null,
        forceCompanyId: companyId,
      });

      if (estimateResult.type !== "success" || !estimateResult.data) {
        throw new AppError(
          400,
          estimateResult.type === "globalError" ||
            estimateResult.type === "error"
            ? estimateResult.message
            : "Failed to create estimate via shared action",
        );
      }

      const estimate = estimateResult.data;

      // Mark lead as estimate created if exists
      if (client?.leadId) {
        await tx.lead.update({
          where: { id: client?.leadId },
          data: { isEstimateCreated: true },
        });
      }

      // 9. Create Appointment
      const slotInterval = bookingSettings.slotInterval;
      const endTime = moment(appointmentStartTime, "HH:mm")
        .add(slotInterval, "minutes")
        .format("HH:mm");

      const appointmentResult = await addAppointment({
        title: `${year} ${make} ${model} - ${fullName}`,
        date: appointmentDate,
        startTime: appointmentStartTime,
        endTime,
        clientId: client?.id,
        vehicleId: vehicle?.id,
        notes: notes || null,
        draftEstimate: estimate.id,
        timezone: "UTC", // Defaulting, you might obtain from shop.company.timezone
        assignedUsers: [], // Empty for guest bookings, unless specific logic is added
        forceCompanyId: companyId,
        forceUserId: findCompanyAdminUser?.id,
      });

      if (appointmentResult.type !== "success" || !appointmentResult.data) {
        throw new AppError(
          400,
          appointmentResult.type === "globalError" ||
            appointmentResult.type === "error"
            ? appointmentResult.message
            : "Failed to create appointment via shared action",
        );
      }

      const appointment = appointmentResult.data;

      // 10. Create ShopBooking History
      const shopBooking = await tx.shopBooking.create({
        data: {
          shopId: shop.id,
          clientId: client?.id,
          appointmentId: appointment.id,
          invoiceId: estimate.id,
          subtotal,
          total: subtotal,
          balanceDue: subtotal,
          customerNotes: notes || null,
        },
      });

      // Create snapshot entries for the services in ShopBookingService
      for (const srv of selectedServices) {
        await tx.shopBookingService.create({
          data: {
            shopBookingId: shopBooking.id,
            shopServiceId: srv.id,
            title: srv.title,
            price: srv.price,
            duration: srv.duration,
          },
        });
      }

      // Return success response
      return NextResponse.json(
        {
          success: true,
          message: "Virtual shop service created successfully",
          data: {
            appointmentId: appointment.id,
            estimateId: estimate.id,
            shopBookingId: shopBooking.id,
          },
        },
        { status: 200 },
      );
    });
  } catch (error: any) {
    console.error("Error in POST /api/virtual-shop/service-booking:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create shop service",
      },
      { status: 200 },
    );
  }
}
