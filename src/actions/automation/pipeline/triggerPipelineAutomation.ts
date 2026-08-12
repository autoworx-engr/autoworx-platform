// app/actions/updatePipelineTrigger.ts
"use server";

import { getUserById } from "@/actions/user/getUserById";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { generateAccessToken } from "@/lib/tokenGenerator";
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
      },
    );

    const data = await response.json();
    // Revalidate the specific path or use tag-based revalidation if applicable
    console.log("pipeline automation triggered", data);
    if (
      condition === "MESSAGE_SENT_CLIENT" ||
      condition === "MESSAGE_RECEIVED_CLIENT"
    ) {
      // do nothing
    }

    if (data.statusCode === 401) {
      console.error("Error updating pipeline automation trigger:", data.errors);
      throw new Error(data.errors);
    }

    return {
      success: "ok",
      data: data.data,
    };
  } catch (error) {
    console.error("Error updating pipeline automation trigger:", error);
  }
}

export async function updatePipelineAutomationTriggerWithToken({
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
    const companyWithUser = await db.company.findFirst({
      where: { id: companyId, users: { some: { employeeType: "Admin" } } },
      include: { users: true },
    });

    const user = companyWithUser?.users?.[0];

    if (!user) {
      throw new Error("User not found");
    }

    const accessToken = await generateAccessToken(user);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/pipeline-automation-trigger`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          condition,
          companyId,
          leadId,
          columnId,
        }),
      },
    );

    const data = await response.json();

    return {
      success: "ok",
      data: data.data,
    };
  } catch (error) {
    console.error("Error updating pipeline automation trigger:", error);
  }
}
