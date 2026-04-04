import EstimatesTab, {
  type AppointmentStatus,
  type Estimate,
  type FilterStatus,
} from "../../../components/EstimatesTab";
import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import type { Prisma, ShopBookingStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import ShopNotFound from "@/app/subdomain/[subdomain]/components/giftcards/ShopNotFound";

type PageSearchParams = {
  search?: string | string[];
  status?: string | string[];
  page?: string | string[];
  startDate?: string | string[];
  endDate?: string | string[];
};

type VirtualShopEstimatesPageProps = {
  params: {
    shopId: string;
  };
  searchParams?: Promise<PageSearchParams>;
};

type ShopBookingRow = {
  id: number;
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
    date: Date | null;
    startTime: string | null;
    endTime: string | null;
  } | null;
  invoice: {
    subtotal: unknown;
    tax: unknown;
    serviceFee: unknown;
    grandTotal: unknown;
    vehicleExtraCost: unknown;
  } | null;
  services: Array<{
    title: string;
    price: unknown;
    duration: number;
    modifierType: string | null;
    modifierPrice: unknown;
  }>;
};

const PAGE_SIZE = 10;
const STATUSES: FilterStatus[] = ["all", "confirmed", "pending", "completed", "cancelled"];

const bookingInclude = {
  client: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
  vehicle: {
    select: {
      year: true,
      make: true,
      model: true,
    },
  },
  appointment: {
    select: {
      date: true,
      startTime: true,
      endTime: true,
    },
  },
  invoice: {
    select: {
      subtotal: true,
      tax: true,
      serviceFee: true,
      grandTotal: true,
      vehicleExtraCost: true,
    },
  },
  services: {
    select: {
      title: true,
      price: true,
      duration: true,
      modifierType: true,
      modifierPrice: true,
    },
  },
} satisfies Prisma.ShopBookingInclude;

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

  const subtotal = Number(item.invoice?.subtotal ?? fallbackSubtotal);
  const taxRate = Number(item.invoice?.tax ?? 0);
  const vehicleExtraCost = Number(item.invoice?.vehicleExtraCost ?? 0);
  const serviceFee = Number(item.invoice?.serviceFee ?? 0);
  const total = Number(item.invoice?.grandTotal ?? subtotal + serviceFee);
  const totalServiceCost = subtotal - vehicleExtraCost;
  const taxAmount = (totalServiceCost * taxRate) / 100;

  const fullName = `${item.client?.firstName || ""} ${item.client?.lastName || ""}`.trim();
  const startMinutes = parseTimeToMinutes(item.appointment?.startTime);
  const endMinutes = parseTimeToMinutes(item.appointment?.endTime);
  const serviceDuration = services.reduce((sum, svc) => sum + svc.durationMinutes, 0);

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

export default async function VirtualShopEstimatesPage({
  params,
  searchParams,
}: VirtualShopEstimatesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const search = first(resolvedSearchParams?.search)?.trim() || "";
  const rawStatus = (first(resolvedSearchParams?.status) || "all").toLowerCase();
  const status: FilterStatus = STATUSES.includes(rawStatus as FilterStatus)
    ? (rawStatus as FilterStatus)
    : "all";
  const page = toPositiveInt(first(resolvedSearchParams?.page), 1);

  const startDate = toValidDateInput(first(resolvedSearchParams?.startDate));
  const endDate = toValidDateInput(first(resolvedSearchParams?.endDate));
  const hasDateRange = Boolean(startDate && endDate);

  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  const shopId = Number.parseInt(params.shopId, 10);

  if (!companyId || !Number.isFinite(shopId)) {
    return <ShopNotFound />;
  }

  const shop = await db.shop.findFirst({
    where: {
      id: shopId,
      companyId,
    },
    select: { id: true },
  });

  if (!shop) {
    return (
      <EstimatesTab
        estimates={[]}
        totalRecords={0}
        currentPage={1}
        pageSize={PAGE_SIZE}
        search={search}
        status={status}
        startDate={startDate}
        endDate={endDate}
        statusCounts={{
          all: 0,
          confirmed: 0,
          pending: 0,
          completed: 0,
          cancelled: 0,
        }}
      />
    );
  }

  const whereBase: Prisma.ShopBookingWhereInput = {
    shopId: shop.id,
  };

  if (search) {
    const searchNum = Number.parseInt(search, 10);
    whereBase.OR = [
      {
        client: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        },
      },
      {
        vehicle: {
          OR: [
            { make: { contains: search, mode: "insensitive" } },
            { model: { contains: search, mode: "insensitive" } },
            ...(Number.isNaN(searchNum) ? [] : [{ year: searchNum }]),
          ],
        },
      },
      {
        services: {
          some: {
            title: { contains: search, mode: "insensitive" },
          },
        },
      },
    ];
  }

  if (hasDateRange) {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59.999`);

    whereBase.appointment = {
      date: {
        gte: start,
        lte: end,
      },
    };
  }

  const whereForList: Prisma.ShopBookingWhereInput = {
    ...whereBase,
    ...(status === "all"
      ? {}
      : { status: status.toUpperCase() as ShopBookingStatus }),
  };

  const [
    filteredTotal,
    shopBookings,
    allCount,
    confirmedCount,
    pendingCount,
    completedCount,
    cancelledCount,
  ] = await db.$transaction([
    db.shopBooking.count({ where: whereForList }),
    db.shopBooking.findMany({
      where: whereForList,
      include: bookingInclude,
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.shopBooking.count({ where: whereBase }),
    db.shopBooking.count({ where: { ...whereBase, status: "CONFIRMED" } }),
    db.shopBooking.count({ where: { ...whereBase, status: "PENDING" } }),
    db.shopBooking.count({ where: { ...whereBase, status: "COMPLETED" } }),
    db.shopBooking.count({ where: { ...whereBase, status: "CANCELLED" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const estimates = (shopBookings as ShopBookingRow[]).map(toEstimate);

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
        all: allCount,
        confirmed: confirmedCount,
        pending: pendingCount,
        completed: completedCount,
        cancelled: cancelledCount,
      }}
    />
  );
}
