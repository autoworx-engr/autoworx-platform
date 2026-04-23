import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";

/**
 * Get essential session information including companyId and userId.
 * This is a shared utility used across multiple dashboard actions.
 */
export async function getEssentials() {
  const session = await getServerSession(authOptions);

  return {
    companyId: session?.user?.companyId as number,
    userId: Number(session?.user?.id as string),
  };
}
