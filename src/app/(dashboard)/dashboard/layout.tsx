export const dynamic = "force-dynamic";

import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { SyncLists } from "@/components/SyncLists";
import AuthorizeNetSignatureKeyAlert from "@/components/AuthorizeNetSignatureKeyAlert";
import { getServerSession } from "next-auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;

  const [categories, company] = await Promise.all([
    companyId
      ? db.category.findMany({
          where: { companyId },
          orderBy: { name: "asc" },
        })
      : [],
    companyId
      ? db.company.findUnique({
          where: { id: companyId },
          select: {
            paymentGateway: true,
            authorizeNetApiLoginId: true,
            authorizeNetSignatureKey: true,
          },
        })
      : null,
  ]);

  const needsSignatureKey =
    !!company &&
    (company.paymentGateway === "AUTHORIZE_NET" ||
      company.paymentGateway === "BOTH") &&
    !!company.authorizeNetApiLoginId &&
    !company.authorizeNetSignatureKey;

  return (
    <>
      <SyncLists categories={categories} />
      <AuthorizeNetSignatureKeyAlert needsSignatureKey={needsSignatureKey} />
      {children}
    </>
  );
}
