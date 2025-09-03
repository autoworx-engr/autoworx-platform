import { db } from "@/lib/db";
import { Cron } from "croner";

import { sendMessage } from "@/actions/communication/client/sendMessage";
import { sendInfobipEmail } from "@/actions/estimate/invoice/sendInfobipEmail";
import moment from "moment-timezone";
// Schedule the cron job
// new Cron("*/5 * * * * *", async () => {
// });

// Run a cron job every day at midnight to expire coupons
const job = new Cron("0 0 * * *", async () => {
  await db.coupon.updateMany({
    where: {
      endDate: {
        lt: new Date(), // Find all coupons where the end date is in the past
      },
      status: "Active", // Only target coupons that are still active
    },
    data: {
      status: "Expired", // Set the status to expired
    },
  });
});
console.log("Executing CRON File");
await (async function appointmentReminders() {
  try {
    console.log("Executing CRON Function");

    // Fetch all appointments that have reminders enabled
    const appointments = await db.appointment.findMany({
      where: {
        reminderEmailTemplateStatus: true,
      },
      include: {
        client: true,
        vehicle: true,
      },
    });

    // Schedule emails for all appointments
    for (const appointment of appointments) {
      if (!appointment?.reminderEmailTemplateId) continue;
      let reminderTemplate = await db.emailTemplate.findUnique({
        where: {
          id: appointment.reminderEmailTemplateId,
        },
      });
      const company = await db.company.findFirst({
        where: {
          id: appointment?.companyId,
        },
        select: {
          timezone: true,
        },
      });
      if (!reminderTemplate) continue;

      //@ts-expect-error
      appointment.reminderTemplate = reminderTemplate;

      if (
        appointment?.startTime &&
        appointment.times &&
        Array.isArray(appointment.times) &&
        appointment.times.length > 0
      ) {
        for (const time of appointment.times) {
          if (!time) continue;
          const reminderDate = moment.tz(
            // @ts-ignore
            `${time.date}T${time.time}`,
            company?.timezone || appointment?.timezone || "Etc/UTC"
          );

          // const cronExpression = `${reminderDate.utc().minutes()} ${reminderDate.utc().hours()} ${reminderDate.utc().date()} ${reminderDate.utc().month() + 1} *`;
          // Schedule the email
          new Cron(
            reminderDate.toDate(),
            {
              timezone: company?.timezone || appointment?.timezone || "Etc/UTC",
            },
            async () => {
              const stillExists = await db.appointment.findUnique({
                where: { id: appointment.id },
              });

              if (!stillExists) {
                console.log("Appointment deleted. Skipping reminder.");
                return;
              }
              //@ts-expect-error
              if (appointment.client && appointment.reminderTemplate) {
                const appointmentDateTime = moment.tz(
                  `${appointment.date}T${appointment.startTime}:00`,
                  appointment.timezone ?? "Etc/UTC"
                );

                //@ts-expect-error
                const reminderSubject = appointment.reminderTemplate.subject
                  .replace("<VEHICLE>", appointment.vehicle?.model || "")
                  .replace(
                    "<CLIENT>",
                    `${appointment.client.firstName ? appointment.client.firstName : appointment.client.lastName}`
                  )

                  .replace(
                    "<DATE>",
                    appointmentDateTime.format("dddd, MMMM DD, h:mm A")
                  );
                //@ts-expect-error
                const reminderMessage = appointment.reminderTemplate.message
                  .replace("<VEHICLE>", appointment.vehicle?.model || "")
                  .replace(
                    "<CLIENT>",
                    `${appointment.client.firstName ? appointment.client.firstName : appointment.client.lastName}`
                  )
                  .replace(
                    "<DATE>",
                    moment(
                      //@ts-expect-error
                      `${new Date(appointment?.date).toISOString()?.split("T")[0]}T${appointment.startTime}:00`
                    ).format("dddd, MMMM DD, h:mm A")
                  );

                if (appointment.clientId) {
                  try {
                    sendInfobipEmail({
                      clientId: appointment.clientId,
                      subject: reminderSubject,
                      text: reminderMessage,
                    });
                  } catch (error) {
                    console.log("🚀 ~ error:", error);
                  }

                  try {
                    sendMessage({
                      companyId: appointment.companyId,
                      clientId: appointment.clientId,
                      message: reminderMessage || "",
                      attachments: [],
                    });
                  } catch (error) {
                    console.log("🚀 ~ error:", error);
                  }
                }
              }
            }
          );
        }
      }
    }
  } catch (error) {
    console.error("Error scheduling reminders:", error);
  }
})();

export async function GET() {
  console.log("Executing CRON Route");

  return Response.json({ message: "Hello from crons" });
}
