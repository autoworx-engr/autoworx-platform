"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";

type CreateLeadFromFormInput = {
  name: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  serviceId?: string;
  opportunity_source: string;
  source?: string;
};

export async function createLeadFromForm(data: CreateLeadFromFormInput) {
  const companyId = await getCompanyId();
  const company = await db.company.findFirst({
    where: { id: companyId },
    select: { zapierToken: true },
  });

  if (!company?.zapierToken) {
    throw new Error("Company token not configured");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set");
  }

  const response = await fetch(`${appUrl}/api/lead-generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-TOKEN": company.zapierToken,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to create lead");
  }

  return response.json();
}
