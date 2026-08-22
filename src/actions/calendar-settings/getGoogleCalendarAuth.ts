"use server";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import crypto from "crypto";
import { google } from "googleapis";
import { redirect } from "next/navigation";

export async function getGoogleCalendarToken() {
  const companyId = await getCompanyId();
  return await db.company.findFirst({
    where: { id: companyId },
    select: { googleCalendarToken: true },
  });
}

export async function generateAuthURL() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/task/auth`,
  );

  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  const state = crypto.randomBytes(32).toString("hex");

  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    include_granted_scopes: true,
    prompt: "consent",
    state: state,
  });

  return redirect(authorizationUrl);
}
