"use server";

import { createLead } from "@/actions/lead/createLead";

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
  return createLead(data);
}
