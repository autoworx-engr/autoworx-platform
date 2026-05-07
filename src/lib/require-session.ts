import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    redirect("/login");
  }
  return session;
}
