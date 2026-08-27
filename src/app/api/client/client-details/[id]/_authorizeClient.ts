import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { NextRequest, NextResponse } from "next/server";

type Authorized = { clientId: number; companyId: number; userId: number };

export async function authorizeClientAccess(
  req: NextRequest,
  rawId: string,
): Promise<{ error: NextResponse } | Authorized> {
  const clientId = parseInt(rawId);
  if (isNaN(clientId)) {
    return {
      error: NextResponse.json(
        { success: false, message: "Invalid client ID" },
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

  const client = await db.client.findUnique({
    where: { id: clientId },
    select: { companyId: true },
  });
  if (!client) {
    return {
      error: NextResponse.json(
        { success: false, message: "Client not found" },
        { status: 404 },
      ),
    };
  }
  if (client.companyId !== principal.companyId) {
    return {
      error: NextResponse.json(
        { success: false, message: "Forbidden: company mismatch" },
        { status: 403 },
      ),
    };
  }

  return {
    clientId,
    companyId: principal.companyId,
    userId: principal.userId,
  };
}
