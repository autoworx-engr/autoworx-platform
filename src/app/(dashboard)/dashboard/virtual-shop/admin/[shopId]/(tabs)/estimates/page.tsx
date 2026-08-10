import EstimatesTab from "../../../components/EstimatesTab";
import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";
import ShopNotFound from "@/app/subdomain/[subdomain]/components/giftcards/ShopNotFound";
import {
  FilterStatus,
  AppointmentStatus,
  Estimate,
} from "../../../components/EstimatesTab.types";
import { Metadata } from "next";

type PageSearchParams = {
  search?: string | string[];
  status?: string | string[];
  page?: string | string[];
  startDate?: string | string[];
  endDate?: string | string[];
};

type VirtualShopEstimatesPageProps = {
  params: Promise<{
    shopId: string;
  }>;
  searchParams?: Promise<PageSearchParams>;
};

type ShopBookingRow = {
  id: number;
  shopId?: number;
  status: string;
  client: {
    firstName: string;
    lastName: string | null;
  } | null;
  vehicle: {
    year: number | null;
    make: string | null;
    model: string | null;
  } | null;
  appointment: {
    date: Date | string | null;
    startTime: string | null;
    endTime: string | null;
  } | null;
  invoice?: {
    subtotal?: unknown;
    tax?: unknown;
    serviceFee?: unknown;
    grandTotal?: unknown;
    vehicleExtraCost?: unknown;
  } | null;
  subtotal?: unknown;
  tax?: unknown;
  serviceFee?: unknown;
  total?: unknown;
  services: Array<{
    title: string;
    price: unknown;
    duration: number;
    modifierType: string | null;
    modifierPrice: unknown;
  }>;
};

type ServiceBookingListResponse = {
  success: boolean;
  meta: {
    totalRecords: number;
    totalPages: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    statusCounts?: {
      pending: number;
      confirmed: number;
      completed: number;
      cancelled: number;
      total: number;
    };
  };
  data: ShopBookingRow[];
};

const PAGE_SIZE = 10;
const STATUSES: FilterStatus[] = [
  "all",
  "confirmed",
  "pending",
  "completed",
  "cancelled",
];

const first = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toValidDateInput(value?: string): string | undefined {
  if (!value) return undefined;
  const maybeDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(maybeDate.getTime())) return undefined;
  return value;
}

function mapStatus(status?: string | null): AppointmentStatus {
  const normalized = (status || "").toLowerCase();

  if (normalized === "confirmed") return "confirmed";
  if (normalized === "pending") return "pending";
  if (normalized === "completed") return "completed";
  if (normalized === "cancelled") return "cancelled";

  return "pending";
}

function formatDateLabel(value?: Date | string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "-";

  const [hourString, minuteString = "00"] = value.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return value;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function parseTimeToMinutes(value?: string | null) {
  if (!value) return null;

  const [hourString, minuteString = "00"] = value.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function formatDuration(minutes: number) {
  if (minutes <= 0) return "-";

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;

  return `${hours}h ${mins}m`;
}

function toEstimate(item: ShopBookingRow): Estimate {
  const services = item.services.map((svc) => ({
    name: svc.title,
    vehicleType: svc.modifierType || "Vehicle",
    basePrice: Number(svc.price || 0),
    adjustment: Number(svc.modifierPrice || 0),
    durationMinutes: Number(svc.duration || 0),
  }));

  const fallbackSubtotal = services.reduce(
    (sum, svc) => sum + svc.basePrice + svc.adjustment,
    0,
  );

  const subtotal = Number(
    item.subtotal ?? item.invoice?.subtotal ?? fallbackSubtotal,
  );
  const taxRate = Number(item.invoice?.tax ?? 0);
  const vehicleExtraCost = Number(item.invoice?.vehicleExtraCost ?? 0);
  const serviceFee = Number(item.serviceFee ?? item.invoice?.serviceFee ?? 0);
  const total = Number(
    item.total ?? item.invoice?.grandTotal ?? subtotal + serviceFee,
  );
  const totalServiceCost = subtotal - vehicleExtraCost;
  const taxAmount = Number(item.tax ?? (totalServiceCost * taxRate) / 100);

  const fullName =
    `${item.client?.firstName || ""} ${item.client?.lastName || ""}`.trim();
  const startMinutes = parseTimeToMinutes(item.appointment?.startTime);
  const endMinutes = parseTimeToMinutes(item.appointment?.endTime);
  const serviceDuration = services.reduce(
    (sum, svc) => sum + svc.durationMinutes,
    0,
  );

  const duration =
    startMinutes !== null && endMinutes !== null && endMinutes > startMinutes
      ? formatDuration(endMinutes - startMinutes)
      : formatDuration(serviceDuration);

  const vehicle = [item.vehicle?.year, item.vehicle?.make, item.vehicle?.model]
    .map((part) => (part ?? "").toString().trim())
    .filter(Boolean)
    .join(" ");

  return {
    id: item.id,
    clientName: fullName || "Unknown Client",
    status: mapStatus(item.status),
    date: formatDateLabel(item.appointment?.date),
    time: formatTime(item.appointment?.startTime),
    duration,
    vehicle: vehicle || "Vehicle not provided",
    services,
    subtotal,
    taxAmount,
    serviceFee,
    total,
  };
}

export const metadata: Metadata = {
  title: "Virtual Shop Estimates",
  description: "View and manage your virtual shop estimates and bookings.",
};

export default async function VirtualShopEstimatesPage({
  params,
  searchParams,
}: VirtualShopEstimatesPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const search = first(resolvedSearchParams?.search)?.trim() || "";
  const rawStatus = (
    first(resolvedSearchParams?.status) || "all"
  ).toLowerCase();
  const status: FilterStatus = STATUSES.includes(rawStatus as FilterStatus)
    ? (rawStatus as FilterStatus)
    : "all";
  const page = toPositiveInt(first(resolvedSearchParams?.page), 1);

  const startDate = toValidDateInput(first(resolvedSearchParams?.startDate));
  const endDate = toValidDateInput(first(resolvedSearchParams?.endDate));
  const hasDateRange = Boolean(startDate && endDate);

  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;
  const shopId = Number.parseInt(resolvedParams.shopId, 10);

  if (!accessToken || !Number.isFinite(shopId)) {
    return <ShopNotFound />;
  }

  const query = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    shopId: String(shopId),
  });
  if (search) query.set("search", search);
  if (status !== "all") query.set("status", status);
  if (hasDateRange && startDate && endDate) {
    query.set("startDate", startDate);
    query.set("endDate", endDate);
  }

  let responseData: ServiceBookingListResponse | null = null;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL is not configured");
    }

    const response = await fetch(
      `${baseUrl}/api/virtual-shop/service-booking?${query.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (response.ok) {
      const json = (await response.json()) as ServiceBookingListResponse;
      if (json?.success) {
        responseData = json;
      }
    }
  } catch {
    responseData = null;
  }

  const filteredTotal = responseData?.meta?.totalRecords ?? 0;
  const totalPages = Math.max(1, responseData?.meta?.totalPages ?? 1);
  const currentPage = Math.min(page, totalPages);
  const estimates = (responseData?.data ?? []).map(toEstimate);
  const statusCounts = responseData?.meta?.statusCounts;

  return (
    <EstimatesTab
      estimates={estimates}
      totalRecords={filteredTotal}
      currentPage={currentPage}
      pageSize={PAGE_SIZE}
      search={search}
      status={status}
      startDate={startDate}
      endDate={endDate}
      statusCounts={{
        all: statusCounts?.total ?? 0,
        confirmed: statusCounts?.confirmed ?? 0,
        pending: statusCounts?.pending ?? 0,
        completed: statusCounts?.completed ?? 0,
        cancelled: statusCounts?.cancelled ?? 0,
      }}
    />
  );
}
