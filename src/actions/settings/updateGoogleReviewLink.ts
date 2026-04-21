"use server";

import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateGoogleReviewLink(googleReviewLink: string) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return { success: false, error: "Company not found" };
    }

    // Validate URL format if provided
    if (googleReviewLink && googleReviewLink.trim() !== "") {
      try {
        new URL(googleReviewLink);
      } catch {
        return { success: false, error: "Invalid URL format" };
      }
    }

    await db.company.update({
      where: { id: companyId },
      data: {
        googleReviewLink: googleReviewLink.trim() || null,
      },
    });

    revalidatePath("/settings/communication");

    return { success: true };
  } catch (error) {
    console.error("Error updating Google Review link:", error);
    return {
      success: false,
      error: "Failed to update Google Review link",
    };
  }
}
