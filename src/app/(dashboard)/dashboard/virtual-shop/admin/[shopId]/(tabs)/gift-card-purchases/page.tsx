import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import ShopNotFound from "@/app/subdomain/[subdomain]/components/giftcards/ShopNotFound";
import GiftCardPurchasesTab, {
  type GiftCardStatusFilter,
  type IssuedGiftCardItem,
  type GiftCardPurchaseSummary,
} from "../../../components/GiftCardPurchasesTab";
import { Metadata } from "next";

type PageSearchParams = {
  search?: string | string[];
  status?: string | string[];
  page?: string | string[];
  startDate?: string | string[];
  endDate?: string | string[];
};

type Props = {
  params: Promise<{ shopId: string }>;
  searchParams?: Promise<PageSearchParams>;
};

const PAGE_SIZE = 10;
const VALID_STATUSES = ["ACTIVE", "DEPLETED", "EXPIRED", "FROZEN"] as const;

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

function toPositiveInt(value: string | undefined, fallback: number) {
  const n = Number.parseInt(value || "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function toValidDate(value?: string) {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : value;
}

const emptySummary: GiftCardPurchaseSummary = {
  totalIssued: 0,
  totalInitialValue: 0,
  totalRemainingBalance: 0,
  totalRedeemedValue: 0,
  statusBreakdown: {},
};

export const metadata: Metadata = {
  title: "Gift Card Purchases",
  description: "View and manage your virtual shop gift card purchases.",
};

export default async function GiftCardPurchasesPage(props: Props) {
  const params = await props.params;
  const searchParams = props.searchParams;
  const resolved = searchParams ? await searchParams : undefined;

  const search = first(resolved?.search)?.trim() || "";
  const rawStatus = (first(resolved?.status) || "").toUpperCase();
  const status: GiftCardStatusFilter = (
    VALID_STATUSES as readonly string[]
  ).includes(rawStatus)
    ? (rawStatus as GiftCardStatusFilter)
    : "ALL";
  const page = toPositiveInt(first(resolved?.page), 1);
  const startDate = toValidDate(first(resolved?.startDate));
  const endDate = toValidDate(first(resolved?.endDate));

  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;
  const shopId = Number.parseInt(params.shopId, 10);

  if (!accessToken || !Number.isFinite(shopId)) {
    return <ShopNotFound />;
  }

  // Build query params for the API (uses "from"/"to" for date range)
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  if (status !== "ALL") query.set("status", status);
  if (startDate) query.set("from", startDate);
  if (endDate) query.set("to", endDate);
  query.set("page", String(page));
  query.set("limit", String(PAGE_SIZE));

  // Derive base URL from the incoming request host so it works in all environments
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = process.env.NEXTAUTH_URL ?? `${protocol}://${host}`;

  query.set("shopId", String(shopId));
  const url = `${baseUrl}/api/virtual-shop/gift-card?${query.toString()}`;

  let apiData: {
    data: any[];
    meta: { total: number; page: number; limit: number; totalPages: number };
    summary: GiftCardPurchaseSummary;
  } | null = null;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        apiData = json;
      }
    }
  } catch {
    // fall through to empty state
  }

  if (!apiData) {
    return (
      <GiftCardPurchasesTab
        items={[]}
        totalRecords={0}
        currentPage={1}
        pageSize={PAGE_SIZE}
        search={search}
        status={status}
        startDate={startDate}
        endDate={endDate}
        summary={emptySummary}
      />
    );
  }

  const items: IssuedGiftCardItem[] = apiData.data.map((row: any) => ({
    id: row.id,
    orderNumber: row.orderNumber ?? null,
    code: row.code,
    purchaserName: row.purchaserName,
    purchaserEmail: row.purchaserEmail,
    recipientName: row.recipientName,
    recipientEmail: row.recipientEmail ?? null,
    recipientPhone: row.recipientPhone ?? null,
    initialBalance: Number(row.initialBalance),
    currentBalance: Number(row.currentBalance),
    status: row.status,
    deliveryMethod: row.deliveryMethod,
    purchaseType: row.purchaseType,
    scheduledSendAt: row.scheduledSendAt ?? null,
    createdAt: row.createdAt,
    template: row.template
      ? {
          id: row.template.id,
          name: row.template.name,
          imageUrl: row.template.imageUrl,
        }
      : null,
    transactionCount: row._count?.transactions ?? 0,
  }));

  const totalPages = Math.max(1, apiData.meta.totalPages);
  const safePage = Math.min(page, totalPages);

  return (
    <GiftCardPurchasesTab
      items={items}
      totalRecords={apiData.meta.total}
      currentPage={safePage}
      pageSize={PAGE_SIZE}
      search={search}
      status={status}
      startDate={startDate}
      endDate={endDate}
      summary={apiData.summary}
    />
  );
}
