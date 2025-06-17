// app/actions/updatePipelineTrigger.ts
"use server";

import { revalidatePath } from "next/cache";

export async function updatePipelineAutomationTrigger({
  condition,
  companyId,
  leadId,
  columnId,
}: {
  condition: string;
  companyId: number;
  leadId: number;
  columnId: number;
}) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/pipeline-automation-trigger`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        condition,
        companyId,
        leadId,
        columnId,
      }),
    },
  );

  // Revalidate the specific path or use tag-based revalidation if applicable
  if (
    condition === "MESSAGE_SENT_CLIENT" ||
    condition === "MESSAGE_RECEIVED_CLIENT"
  ) {
    // do nothing
  }

  return {
    success: "ok",
  };
}
