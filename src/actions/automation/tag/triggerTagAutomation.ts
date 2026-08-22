// app/actions/updatePipelineTrigger.ts
"use server";

import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";

type TUpdateTagAutomationTrigger = {
  companyId: number;
  leadId?: number;
  invoiceId?: string;
  columnId: number;
  tagId?: number;
  pipelineType: "SALES" | "SHOP";
  conditionType?: "pipeline" | "communication" | "post_tag" | null;
  generatedToken?: string;
};

export async function updateTagAutomationTrigger(
  payload: TUpdateTagAutomationTrigger,
) {
  const { generatedToken, ...payloadData } = payload;

  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken || generatedToken;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/tag-automation-trigger`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...payloadData,
        }),
      },
    );
    const data = await response.json();
    console.log("tag automation triggered", payloadData);
    return {
      success: "ok",
      data: data.data,
    };
  } catch (error) {
    console.error("Error updating tag automation trigger:", error);
  }
}
