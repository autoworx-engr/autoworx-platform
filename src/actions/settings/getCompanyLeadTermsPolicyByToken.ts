"use server";

import { db } from "@/lib/db";

export async function getCompanyLeadTermsPolicyByToken(token: string): Promise<{
  leadTerms: string;
  leadPolicy: string;
} | null> {
  try {
    const company = await db.company.findUnique({
      where: {
        zapierToken: token,
      },
      select: {
        leadTerms: true,
        leadPolicy: true,
      },
    });

    if (!company) {
      return null;
    }

    return {
      leadTerms: company.leadTerms ?? "",
      leadPolicy: company.leadPolicy ?? "",
    };
  } catch (error) {
    console.error(
      "Error fetching company lead terms and policy by token:",
      error,
    );
    return null;
  }
}
