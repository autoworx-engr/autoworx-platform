import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";
import "server-only";

export async function getCompanyId() {
  const session = await getServerSession(authOptions);
  return session?.user?.companyId as number;
}
