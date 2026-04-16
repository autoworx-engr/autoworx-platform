import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { SyncLists } from "@/components/SyncLists";
import { getServerSession } from "next-auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;

  const categories = companyId
    ? await db.category.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <>
      <SyncLists categories={categories} />
      {children}
    </>
  );
}
