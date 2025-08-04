import { getCalendarSettings } from "@/actions/calendar-settings/getCalendarSettings";
import { NextResponse } from "next/server";

export async function GET() {
  const settings = await getCalendarSettings();
  return NextResponse.json(settings);
}
