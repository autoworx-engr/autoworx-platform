// app/actions/updatePipelineTrigger.ts
"use server";

import { authOptions } from "@/authOptions";
import { ConditionType } from "@prisma/client";
import { getServerSession } from "next-auth";

export async function updatePipelineAutomationTrigger({
  condition,
  companyId,
  leadId,
  columnId,
}: {
  condition: ConditionType;
  companyId: number;
  leadId: number;
  columnId: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken || null;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/pipeline-automation-trigger`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          condition,
          companyId,
          leadId,
          columnId,
        }),
      }
    );

    const data = await response.json();

    // Revalidate the specific path or use tag-based revalidation if applicable
    if (
      condition === "MESSAGE_SENT_CLIENT" ||
      condition === "MESSAGE_RECEIVED_CLIENT"
    ) {
      // do nothing
    }

    return {
      success: "ok",
      data: data.data,
    };
  } catch (error) {
    console.error("Error updating pipeline automation trigger:", error);
  }
}
