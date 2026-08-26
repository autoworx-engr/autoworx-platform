import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

type Authorized = { taskId: number; companyId: number; userId: number };

export async function authorizeTaskAccess(
  req: NextRequest,
  rawId: string,
): Promise<{ error: NextResponse } | Authorized> {
  const taskId = Number(rawId);
  if (!Number.isFinite(taskId)) {
    return {
      error: NextResponse.json(
        { success: false, message: "Invalid task id" },
        { status: 400 },
      ),
    };
  }

  const principal = await getAuthPrincipal(req);
  if (!principal) {
    return {
      error: NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { companyId: true },
  });
  if (!task) {
    return {
      error: NextResponse.json(
        { success: false, message: "Task not found" },
        { status: 404 },
      ),
    };
  }
  if (task.companyId !== principal.companyId) {
    return {
      error: NextResponse.json(
        { success: false, message: "Forbidden: company mismatch" },
        { status: 403 },
      ),
    };
  }

  return { taskId, companyId: principal.companyId, userId: principal.userId };
}

type TaskRelations = {
  clientId?: number | null;
  leadId?: number | null;
  assignedUsers?: number[];
};

/**
 * Reject task relations that point at another company's records — otherwise a
 * PATCH can attach a foreign client/lead and have it echoed back in the
 * response `include`.
 */
export async function validateTaskRelations(
  { clientId, leadId, assignedUsers }: TaskRelations,
  companyId: number,
): Promise<NextResponse | null> {
  const reject = (message: string) =>
    NextResponse.json({ success: false, message }, { status: 400 });

  if (clientId) {
    const client = await db.client.findFirst({
      where: { id: Number(clientId), companyId },
      select: { id: true },
    });
    if (!client) return reject("Client not found");
  }

  if (leadId) {
    const lead = await db.lead.findFirst({
      where: { id: Number(leadId), companyId },
      select: { id: true },
    });
    if (!lead) return reject("Lead not found");
  }

  if (assignedUsers?.length) {
    const ids = assignedUsers.map(Number);
    const count = await db.user.count({
      where: { id: { in: ids }, companyId },
    });
    if (count !== new Set(ids).size) return reject("Invalid assigned users");
  }

  return null;
}
