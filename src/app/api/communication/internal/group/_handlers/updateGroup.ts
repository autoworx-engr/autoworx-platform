import { findDuplicateGroupName } from "@/actions/communication/internal/_utils/groupName";
import { deleteGroupIfEmpty } from "@/actions/communication/internal/_utils/deleteGroupIfEmpty";
import { AppError } from "@/error-boundary/error";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { db } from "@/lib/db";
import { getAuthPrincipal } from "@/lib/getAuthPrincipal";
import { getPusherInstance } from "@/lib/pusher/server";
import { NextRequest, NextResponse } from "next/server";
import { findUsers } from "./findUsers";
import { normalizeGroupName } from "@/lib/utils/groupName";

const pusher = getPusherInstance();

export async function updateGroupHandler(req: NextRequest) {
  try {
    const principal = await getAuthPrincipal(req);
    if (!principal) throw new AppError(401, "Unauthorized");

    const { groupId, name, users } = await req.json();

    if (!groupId) {
      throw new AppError(400, "Group ID is required");
    }
    // Legacy groups can have companyId = null; membership check enforces tenant isolation.
    const findGroup = await db.group.findFirst({
      where: {
        id: groupId,
        OR: [{ companyId: principal.companyId }, { companyId: null }],
        users: { some: { id: principal.userId } },
      },
      select: { id: true, name: true },
    });

    if (!findGroup) {
      throw new AppError(404, "Group not found");
    }

    // Duplicate-name check (skipped when name unchanged). Scoped to the
    // caller's company — legacy null-companyId groups aren't part of the
    // tenant namespace.
    let normalizedNewName: string | undefined;
    if (typeof name === "string") {
      normalizedNewName = normalizeGroupName(name);
      if (!normalizedNewName) {
        throw new AppError(400, "Group name is required");
      }
      const currentNormalized = normalizeGroupName(findGroup.name);
      if (normalizedNewName.toLowerCase() !== currentNormalized.toLowerCase()) {
        const duplicate = await findDuplicateGroupName(
          principal.companyId,
          normalizedNewName,
          groupId,
        );
        if (duplicate) {
          throw new AppError(409, "Group name already exists.");
        }
      }
    }

    const connectUsers =
      users
        ?.filter(
          (u: { id: number; action?: string }) =>
            u.action === "add" || !u.action,
        )
        .map((u: { id: number }) => ({ id: u.id })) || [];
    const disconnectUsers =
      users
        ?.filter((u: { id: number; action?: string }) => u.action === "remove")
        .map((u: { id: number }) => ({ id: u.id })) || [];

    if (connectUsers.length > 0) {
      await findUsers(connectUsers, principal.companyId);
    }

    const { updatedGroup, groupDeleted } = await db.$transaction(async (tx) => {
      const updated = await tx.group.update({
        where: { id: groupId },
        data: {
          name: normalizedNewName,
          users: {
            connect: connectUsers.length > 0 ? connectUsers : undefined,
            disconnect:
              disconnectUsers.length > 0 ? disconnectUsers : undefined,
          },
        },
        include: { users: true },
      });
      const deleted =
        disconnectUsers.length > 0
          ? await deleteGroupIfEmpty(groupId, tx)
          : false;
      return { updatedGroup: updated, groupDeleted: deleted };
    });

    if (connectUsers.length > 0) {
      pusher.trigger("add-member-in-group", "add-member", {
        groupId: updatedGroup.id,
        userIds: connectUsers,
      });
    }
    if (disconnectUsers.length > 0) {
      // Same channel both ways — when groupDeleted is true, the sidebar's
      // `getGroupById` call will return null and the group is removed from
      // every viewer's list.
      pusher.trigger("delete-group", "delete", {
        groupId: updatedGroup.id,
        userIds: disconnectUsers,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: groupDeleted ? null : updatedGroup,
        message: groupDeleted
          ? "Group deleted (last member left)"
          : "Group updated successfully",
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
