import { authOptions } from "@/authOptions";
import { UrgentRequest } from "@/service/virtual-shop/api";
import { ChevronLeft } from "lucide-react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import UrgentRequestDetail from "./_components/UrgentRequestDetail";

type PageProps = {
  params: Promise<{ shopId: string; id: string }>;
};

export const metadata: Metadata = {
  title: "Virtual Shop - Urgent Request Detail",
  description: "View details of an urgent request for your virtual shop.",
};

export default async function ShopUrgentRequestDetailPage({
  params,
}: PageProps) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;
  const { shopId, id } = await params;
  const requestId = parseInt(id, 10);

  let request: UrgentRequest | null = null;

  if (accessToken && Number.isFinite(requestId)) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (baseUrl) {
        const res = await fetch(
          `${baseUrl}/api/virtual-shop/emergency-requests/${requestId}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
          },
        );
        if (res.ok) {
          const json = await res.json();
          request = json.data ?? null;
        }
      }
    } catch {
      request = null;
    }
  }

  if (!request) {
    return (
      <div className="p-6">
        <Link
          href={`/dashboard/virtual-shop/admin/${shopId}/urgent-requests`}
          className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary"
        >
          <ChevronLeft size={16} />
          Back to Urgent Requests
        </Link>
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 text-slate-400">
          <p className="text-sm font-medium">Request not found</p>
        </div>
      </div>
    );
  }

  return (
    <UrgentRequestDetail
      request={request}
      accessToken={accessToken ?? ""}
      shopId={shopId}
    />
  );
}
