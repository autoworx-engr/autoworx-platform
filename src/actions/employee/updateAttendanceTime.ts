"use server";

import { companyNow } from "@/lib/companyTime";
import { db } from "@/lib/db";
import moment from "moment";
import { sendAttendanceEditedNotification } from "@/lib/notification/workForce-notify";
import { getCompany } from "../settings/getCompany";

export async function updateAttendanceTime(
  employeeId: number,
  date: string,
  field: "clockedIn" | "clockedOut",
  newTime: Date,
  clockInOutId: number | undefined, // Optional parameter for specific clock in/out record
): Promise<{ success: boolean; message?: string }> {
  try {
    // Fetch company information
    const company = await getCompany();
    if (!company) {
      return { success: false, message: "Company not found" };
    }

    // Fetch user information
    const user = await db.user.findUnique({
      where: { id: employeeId },
      include: {
        ClockInOut: true,
      },
    });

    if (!user) {
      return { success: false, message: "Employee not found" };
    }

    // Find the clock in/out record for the specific date
    const clockInOut = await db.clockInOut.findFirst({
      where: {
        id: clockInOutId,
      },
    });

    if (!clockInOut) {
      return {
        success: false,
        message: "No attendance record found for this date",
      };
    }

    // Extract time from newTime and combine with date from clockInOut
    const newTimeOnly = moment(newTime);
    if (!newTimeOnly.isValid()) {
      return { success: false, message: "Invalid time format" };
    }

    // Get the date from the existing clockInOut record
    const existingDate = moment(clockInOut.clockIn); // Use clockIn date as reference

    // Create new datetime by combining existing date with new time
    const combinedDateTime = moment(existingDate)
      .set({
        hour: newTimeOnly.hour(),
        minute: newTimeOnly.minute(),
        second: 0,
        millisecond: 0,
      })
      .toDate();

    // Prepare the update data
    const updateData: any = {};

    if (field === "clockedIn") {
      updateData.clockIn = combinedDateTime;

      // Validate that clock in time is before clock out time (if clock out exists)
      if (
        clockInOut.clockOut &&
        moment(combinedDateTime).isAfter(moment(clockInOut.clockOut))
      ) {
        return {
          success: false,
          message: "Clock in time cannot be after clock out time",
        };
      }
    } else if (field === "clockedOut") {
      updateData.clockOut = combinedDateTime;

      // Validate that clock out time is after clock in time
      if (moment(combinedDateTime).isBefore(moment(clockInOut.clockIn))) {
        console.log("cannot update clock out time before clock in time");
        return {
          success: false,
          message: "Clock out time cannot be before clock in time",
        };
      }
    }

    updateData.updatedAt = companyNow(clockInOut.timezone || company.timezone);

    // Update the attendance record
    await db.clockInOut.update({
      where: { id: clockInOut.id },
      data: updateData,
    });

    await sendAttendanceEditedNotification({
      companyId: user.companyId,
      employeeId: user.id,
      employeeName: `${user.firstName} ${user.lastName ?? ""}`.trim(),
      employeeEmail: user.email,
      employeePhone: user.phone,
      field,
      newTime: moment(combinedDateTime).format("MMM D, YYYY h:mm A"),
    });

    return { success: true, message: "Attendance time updated successfully" };
  } catch (error) {
    console.error("Error updating attendance time:", error);
    return {
      success: false,
      message: "An error occurred while updating attendance time",
    };
  }
}

// Function to validate time constraints
export async function validateTimeUpdate(
  employeeId: number,
  date: string,
  field: "clockedIn" | "clockedOut",
  newTime: Date,
): Promise<{ valid: boolean; message?: string }> {
  try {
    const user = await db.user.findUnique({
      where: { id: employeeId },
      include: {
        ClockInOut: {
          include: {
            ClockBreak: true,
          },
        },
      },
    });

    if (!user) {
      return { valid: false, message: "Employee not found" };
    }

    const clockInOut = user.ClockInOut.find((clock) =>
      moment(clock.clockIn).isSame(moment(date), "day"),
    );

    if (!clockInOut) {
      return {
        valid: false,
        message: "No attendance record found for this date",
      };
    }

    const newTimemoment = moment(newTime);

    // Check if the new time conflicts with existing break times
    if (clockInOut.ClockBreak && clockInOut.ClockBreak.length > 0) {
      for (const breakRecord of clockInOut.ClockBreak) {
        const breakStart = moment(breakRecord.breakStart);
        const breakEnd = breakRecord.breakEnd
          ? moment(breakRecord.breakEnd)
          : null;

        if (field === "clockedIn" && newTimemoment.isAfter(breakStart)) {
          return {
            valid: false,
            message: "Clock in time cannot be after break start time",
          };
        }

        if (
          field === "clockedOut" &&
          breakEnd &&
          newTimemoment.isBefore(breakEnd)
        ) {
          return {
            valid: false,
            message: "Clock out time cannot be before break end time",
          };
        }
      }
    }

    // Additional business logic validations can be added here
    // For example, checking against company policies, maximum working hours, etc.

    return { valid: true };
  } catch (error) {
    console.error("Error validating time update:", error);
    return { valid: false, message: "Error validating time update" };
  }
}
