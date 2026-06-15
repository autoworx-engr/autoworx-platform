import { authOptions } from "@/authOptions";
import type {
  VirtualShopBookingCalendarItem,
  VirtualShopServiceBookingListResponse,
  VirtualShopServiceBookingItem,
} from "@/service/virtual-shop/api";
import { getServerSession } from "next-auth";
import CalendarTab from "../../../components/CalendarTab";
import { Metadata } from "next";

type PageSearchParams = {
  mode?: string | string[];
  year?: string | string[];
  month?: string | string[];
  date?: string | string[];
  selectedPage?: string | string[];
  listPage?: string | string[];
};

type VirtualShopCalendarPageProps = {
  params: Promise<{
    shopId: string;
  }>;
  searchParams?: Promise<PageSearchParams>;
};

const PAGE_SIZE = 10;

const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

const first = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

function emptyListResponse(
  page: number,
): VirtualShopServiceBookingListResponse {
  return {
    success: true,
    meta: {
      totalRecords: 0,
      totalPages: 0,
      page,
      limit: PAGE_SIZE,
      hasNextPage: false,
      hasPrevPage: false,
    },
    data: [],
  };
}

function toCalendarData(
  items: VirtualShopServiceBookingItem[],
): VirtualShopBookingCalendarItem[] {
  return items.map((item) => ({
    id: item.id,
    status: item.status,
    appointment: item.appointment
      ? {
          date: item.appointment.date,
          startTime: item.appointment.startTime,
          endTime: item.appointment.endTime,
        }
      : null,
    client: item.client
      ? {
          firstName: item.client.firstName,
          lastName: item.client.lastName,
        }
      : null,
  }));
}

async function fetchServiceBookings({
  baseUrl,
  accessToken,
  query,
}: {
  baseUrl: string;
  accessToken: string;
  query: URLSearchParams;
}): Promise<VirtualShopServiceBookingListResponse | null> {
  try {
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

    if (!response.ok) return null;

    const json =
      (await response.json()) as VirtualShopServiceBookingListResponse;
    return json?.success ? json : null;
  } catch {
    return null;
  }
}

export const metadata: Metadata = {
  title: "Shop Booking Calendar",
  description: "View and manage your virtual shop bookings and appointments.",
};

export default async function VirtualShopCalendarPage({
  params,
  searchParams,
}: VirtualShopCalendarPageProps) {
  const resolvedParams = await params;
  const now = new Date();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken;
  const shopId = Number.parseInt(resolvedParams.shopId, 10);

  const viewMode =
    first(resolvedSearchParams?.mode) === "list" ? "list" : "grid";
  const viewYear = toPositiveInt(
    first(resolvedSearchParams?.year),
    now.getFullYear(),
  );
  const month1Based = Math.min(
    Math.max(
      toPositiveInt(first(resolvedSearchParams?.month), now.getMonth() + 1),
      1,
    ),
    12,
  );
  const viewMonth = month1Based - 1;
  const monthKey = MONTH_KEYS[viewMonth];
  const isCurrentMonth =
    viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const defaultDay = isCurrentMonth ? now.getDate() : 1;
  const selectedDate =
    first(resolvedSearchParams?.date) ||
    `${viewYear}-${String(month1Based).padStart(2, "0")}-${String(defaultDay).padStart(2, "0")}`;
  const selectedDatePage = toPositiveInt(
    first(resolvedSearchParams?.selectedPage),
    1,
  );
  const listPage = toPositiveInt(first(resolvedSearchParams?.listPage), 1);

  let monthCalendarResponse: {
    success: boolean;
    data: VirtualShopBookingCalendarItem[];
  } = {
    success: true,
    data: [],
  };
  let selectedDateResponse: VirtualShopServiceBookingListResponse =
    emptyListResponse(selectedDatePage);
  let monthListResponse: VirtualShopServiceBookingListResponse =
    emptyListResponse(listPage);

  if (accessToken && Number.isFinite(shopId)) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (baseUrl) {
      if (viewMode === "grid") {
        const [calendarMonthly, selectedByDate] = await Promise.all([
          fetchServiceBookings({
            baseUrl,
            accessToken,
            query: new URLSearchParams({
              year: String(viewYear),
              month: monthKey,
              page: "1",
              limit: "1000",
              shopId: String(shopId),
            }),
          }),
          fetchServiceBookings({
            baseUrl,
            accessToken,
            query: new URLSearchParams({
              date: selectedDate,
              page: String(selectedDatePage),
              limit: String(PAGE_SIZE),
              shopId: String(shopId),
            }),
          }),
        ]);

        if (calendarMonthly) {
          monthCalendarResponse = {
            success: true,
            data: toCalendarData(calendarMonthly.data),
          };
        }

        if (selectedByDate) {
          selectedDateResponse = selectedByDate;
        }
      } else {
        const monthList = await fetchServiceBookings({
          baseUrl,
          accessToken,
          query: new URLSearchParams({
            year: String(viewYear),
            month: monthKey,
            page: String(listPage),
            limit: String(PAGE_SIZE),
            shopId: String(shopId),
          }),
        });

        if (monthList) {
          monthListResponse = monthList;
        }
      }
    }
  }

  return (
    <CalendarTab
      viewMode={viewMode}
      viewYear={viewYear}
      viewMonth={viewMonth}
      selectedDate={selectedDate}
      selectedDatePage={selectedDatePage}
      listPage={listPage}
      monthCalendarResponse={monthCalendarResponse}
      selectedDateResponse={selectedDateResponse}
      monthListResponse={monthListResponse}
    />
  );
}
