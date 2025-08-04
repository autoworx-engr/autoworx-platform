// app/actions/updatePipelineTrigger.ts
"use server";

import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";

export async function updateCommunicationAutomationTrigger({
  companyId,
  leadId,
  columnId,
}: {
  companyId: number;
  leadId: number;
  columnId: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    const token = session?.accessToken || null;
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/communication-automation-trigger`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyId,
          leadId,
          columnId,
        }),
      }
    );
    const data = await response.json();
    return {
      success: "ok",
      data: data.data,
    };
  } catch (error) {
    console.error("Error updating communication automation trigger:", error);
  }
}
