import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import moment from "moment-timezone";
import { createInvoice } from "@/actions/estimate/invoice/create";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      slug,
      shopServiceId,
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
      !shopServiceId ||
      !Array.isArray(shopServiceId) ||
      shopServiceId.length === 0 ||
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

    return await db.$transaction(async (tx) => {
      // 2. Validate Shop Slug
      const shop = await tx.shop.findUnique({
        where: { slug },
      });

      if (!shop) {
        throw new Error("Shop not found with the provided slug.");
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
        client = await tx.client.create({
          data: {
            firstName,
            lastName,
            mobile: phone,
            email,
            companyId,
            isSalesAgent: true,
          },
        });
      }

      // 4. Find or Create Vehicle
      let vehicle = await tx.vehicle.findFirst({
        where: {
          clientId: client.id,
          year: parseInt(year),
          make,
          model,
          companyId,
        },
      });

      if (!vehicle) {
        vehicle = await tx.vehicle.create({
          data: {
            year: parseInt(year),
            make,
            model,
            clientId: client.id,
            companyId,
            submodel: "",
            type: "",
            transmission: "",
            engineSize: "",
            license: "",
            vin: "",
            notes: "",
            other: "",
          },
        });
      }

      // 5. Find ShopBookingSetting & check Availability
      const bookingSettings = await tx.shopBookingSetting.findUnique({
        where: { shopId: shop.id },
        include: { availabilities: true },
      });

      if (!bookingSettings) {
        throw new Error("Shop booking settings not found.");
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
        (a) => a.dayOfWeek === dayOfWeekKey,
      );

      if (!availability || !availability.isOpen) {
        throw new Error(
          `Shop is not open on ${dayOfWeekKey.toLowerCase()}s.`,
        );
      }

      // Validate time bounds
      if (availability.startTime && availability.endTime) {
        const reqTime = moment(appointmentStartTime, "HH:mm");
        const shopStart = moment(availability.startTime, "HH:mm");
        const shopEnd = moment(availability.endTime, "HH:mm");

        if (reqTime.isBefore(shopStart) || reqTime.isAfter(shopEnd)) {
          throw new Error(
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
        throw new Error(
          `No available slots for ${appointmentDate} at ${appointmentStartTime}. Limit reached.`,
        );
      } else if (
        !bookingSettings.isStackingEnabled &&
        existingAppointmentsCount > 0
      ) {
        throw new Error(
          `No available slots for ${appointmentDate} at ${appointmentStartTime}. Slot is already booked.`,
        );
      }

      // 7. Retrieve Service Invoice Items & Calculate Totals
      const selectedServices = await tx.shopService.findMany({
        where: {
          id: { in: shopServiceId },
          shopId: shop.id,
        },
        // We aren't querying nested invoiceItems anymore because the schema types don't support it directly.
        // We will just create bare services in the estimate for now, as a snapshot.
        // If the schema is later updated to link ShopService to InvoiceItem, this could be reinstated.
      });

      if (selectedServices.length === 0) {
        throw new Error("No valid services selected for this shop.");
      }

      let subtotal = 0;
      let durationMs = 0;

      const itemsForInvoice: any[] = [];

      selectedServices.forEach((srv) => {
        subtotal += Number(srv.price);
        durationMs += srv.duration * 60000;
        
        itemsForInvoice.push({
          service: {
            id: srv.id,
            description: srv.description || srv.title,
            name: srv.title,
            price: Number(srv.price),
            duration: srv.duration,
          },
          materials: [], // Empty for now due to schema limitations on ShopService
          labor: null,
          tags: [],
        });
      });

      const estimateId = `EST-${Date.now()}`;

      // 8. Create Estimate using the refactored shared action
      const estimateResult = await createInvoice({
        invoiceId: estimateId,
        type: "Estimate",
        clientId: client.id,
        vehicleId: vehicle.id,
        subtotal,
        discount: 0,
        tax: 0,
        serviceFee: 0,
        deposit: 0,
        depositNotes: "",
        depositMethod: "",
        grandTotal: subtotal,
        due: subtotal,
        internalNotes: "",
        terms: "",
        policy: "",
        customerNotes: notes || "",
        customerComments: "",
        photos: [],
        items: itemsForInvoice as any[],
        tasks: [],
        inspections: [],
        damageNotes: null,
        forceCompanyId: companyId,
      });

      if (estimateResult.type !== "success" || !estimateResult.data) {
        throw new Error(
           estimateResult.type === "globalError" || estimateResult.type === "error" ? estimateResult.message : "Failed to create estimate via shared action"
        );
      }

      const estimate = estimateResult.data;

      // Mark lead as estimate created if exists
      if (client.leadId) {
        await tx.lead.update({
          where: { id: client.leadId },
          data: { isEstimateCreated: true },
        });
      }

      // 9. Create Appointment
      const endTime = moment(appointmentStartTime, "HH:mm")
        .add(durationMs, "milliseconds")
        .format("HH:mm");

      const appointment = await tx.appointment.create({
        data: {
          title: "Virtual Shop Service Booking",
          date: new Date(appointmentDate),
          startTime: appointmentStartTime,
          endTime,
          companyId,
          clientId: client.id,
          vehicleId: vehicle.id,
          // user and sales_agent are the only valid enum values. Assuming we map to a default admin/user.
          userId: 1, // Fallback, needs to be updated based on business logic for guest created appointments
          notes: notes || null,
          draftEstimate: estimate.id,
          // user and sales_agent are the only valid enum values
          createdBy: "user",
          timezone: "UTC", // Defaulting, you might obtain from shop.company.timezone
        },
      });

      // 10. Create ShopBooking History
      const shopBooking = await tx.shopBooking.create({
        data: {
          shopId: shop.id,
          clientId: client.id,
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
      { success: false, message: error.message || "Failed to create shop service" },
      { status: 200 },
    );
  }
}
