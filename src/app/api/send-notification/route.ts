import {
  sendUserNotifications,
  SendUserNotificationsParams,
} from "@/actions/notification/sendUserNotification";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    const body = (await req.json()) as SendUserNotificationsParams;
    const response = await sendUserNotifications(body);
    if (response?.success) {
      return NextResponse.json({ success: true, message: "Notification sent" });
    } else {
      return NextResponse.json(
        { success: false, error: "Failed to send notification" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in send-notification route:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
};
