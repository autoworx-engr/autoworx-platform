import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";
import { UrgentRequestsListResponse } from "@/service/virtual-shop/api";
import UrgentRequestsClient from "./_components/UrgentRequestsClient";
import { Metadata } from "next";

type PageProps = {
  params: Promise<{ shopId: string }>;
  searchParams?: Promise<{ page?: string; limit?: string; status?: string }>;
};

export const metadata: Metadata = {
  title: "Virtual Shop - Urgent Requests",
  description: "View and manage urgent requests for your virtual shop.",
};

export default async function ShopUrgentRequestsPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;

  const { shopId: shopIdParam } = await params;
  const shopId = parseInt(shopIdParam, 10);
  const resolved = searchParams ? await searchParams : {};
  const page = Math.max(1, parseInt(resolved.page ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(resolved.limit ?? "10", 10)));
  const status = resolved.status as any;

  let initialData: UrgentRequestsListResponse | null = null;

  if (accessToken && Number.isFinite(shopId)) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (baseUrl) {
        const qs = new URLSearchParams({
          shopId: String(shopId),
          page: String(page),
          limit: String(limit),
          ...(status ? { status } : {}),
        });
        const res = await fetch(
          `${baseUrl}/api/virtual-shop/emergency-requests?${qs}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            cache: "no-store",
          },
        );
        if (res.ok) {
          initialData = await res.json();
        }
      }
    } catch {
      initialData = null;
    }
  }

  return (
    <UrgentRequestsClient
      initialData={initialData}
      initialPage={page}
      initialLimit={limit}
      initialStatus={status}
      initialShopId={Number.isFinite(shopId) ? shopId : undefined}
      accessToken={accessToken ?? ""}
    />
  );
}
