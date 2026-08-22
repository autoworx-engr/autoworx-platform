import { findDuplicateGroupName } from "@/actions/communication/internal/_utils/groupName";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest, NextResponse } from "next/server";
import { findUsers } from "./findUsers";
import { normalizeGroupName } from "@/lib/utils/groupName";

const pusher = getPusherInstance();

export async function createGroupHandler(req: NextRequest) {
  try {
    const principal = await getAuthPrincipal(req);
    if (!principal) throw new AppError(401, "Unauthorized");

    const { name, users } = await req.json();
    const companyId = principal.companyId;

    const normalizedName = normalizeGroupName(name ?? "");
    if (!normalizedName) {
      throw new AppError(400, "Group name is required");
    }

    const duplicate = await findDuplicateGroupName(companyId, normalizedName);
    if (duplicate) {
      throw new AppError(409, "Group name already exists.");
    }

    await findUsers(users, companyId);

    const groupData = await db.group.create({
      data: {
        name: normalizedName,
        companyId,
        users: { connect: users },
      },
      include: { users: true },
    });

    pusher.trigger("create-group", "create", {
      groupId: groupData.id,
      usersIds: users,
    });

    return NextResponse.json(
      {
        success: true,
        data: groupData,
        message: "Group created successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    const errors = errorHandler(error);
    const message = errors?.message || "Internal Server Error";
    const status = errors?.statusCode || 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
