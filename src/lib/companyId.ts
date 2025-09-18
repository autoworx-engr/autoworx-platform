import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";
import { cache } from "react";
import "server-only";

export const getCompanyId = cache(async function () {
  const session = await getServerSession(authOptions);
  return session?.user?.companyId as number;
});
