"use server";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function updateWorkspaceName(formData: FormData) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  if (companyId == null) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.company.update({
    where: { id: companyId },
    data: { name },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}
