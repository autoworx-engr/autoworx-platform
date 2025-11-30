import {
  sendUserNotifications,
  SendUserNotificationsParams,
} from "@/actions/notification/sendUserNotification";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    const body = (await req.json()) as SendUserNotificationsParams;
    const { userId, title, description, companyId } = body;

    if (!userId || !title || !description || !companyId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }
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
