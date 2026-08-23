"use server";

import { db } from "@/lib/db";
import { getCompanyId } from "@/lib/companyId";
import { revalidatePath } from "next/cache";
import { sendUserNotifications } from "@/actions/notification/sendUserNotification";

export async function acceptCompanyJoin(
  joinId: number,
  _currentCompanyId?: number,
) {
  const currentCompanyId = await getCompanyId();
  if (!currentCompanyId) {
    throw new Error("Unauthorized");
  }

  const join = await db.companyJoin.findUnique({
    where: { id: joinId },
  });

  if (
    !join ||
    (join.companyOneId !== currentCompanyId &&
      join.companyTwoId !== currentCompanyId)
  ) {
    throw new Error("Unauthorized");
  }

  if (!join) {
    throw new Error("Connection request not found");
  }

  if (join.companyTwoId !== currentCompanyId) {
    throw new Error("You are not allowed to accept this request");
  }

  await db.companyJoin.update({
    where: { id: joinId },
    data: { status: "ACCEPTED" },
  });

  revalidatePath("/dashboard/settings/networks");
  await notifyRequester(join.companyOneId, currentCompanyId, "ACCEPTED");
}

export async function notifyRequester(
  requesterCompanyId: number,
  respondingCompanyId: number,
  outcome: "ACCEPTED" | "REJECTED",
) {
  const [respondingCompany, requesterUsers] = await Promise.all([
    db.company.findUnique({
      where: { id: respondingCompanyId },
      select: { name: true },
    }),
    db.user.findMany({
      where: {
        companyId: requesterCompanyId,
        employeeType: { in: ["Admin", "Manager", "Sales"] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        companyId: true,
      },
    }),
  ]);

  const title =
    outcome === "ACCEPTED"
      ? "Collaboration Request Accepted"
      : "Collaboration Request Rejected";
  const description =
    outcome === "ACCEPTED"
      ? `${respondingCompany?.name} accepted your collaboration request.`
      : `${respondingCompany?.name} declined your collaboration request.`;

  await Promise.all(
    requesterUsers.map((user) =>
      sendUserNotifications({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email || "",
        userPhoneNo: user.phone || "",
        companyId: user.companyId,
        iconType: "message",
        title,
        description,
        type: "COLLABORATION_INVITATION",
        redirectUrl: "/dashboard/settings/networks",
      }),
    ),
  );
}
