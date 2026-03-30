import { authOptions } from "@/authOptions";
import type {
  VirtualShopBookingCalendarItem,
  VirtualShopServiceBookingListResponse,
} from "@/service/virtual-shop/api";
import { getServerSession } from "next-auth";
import CalendarTab from "../../components/CalendarTab";

type PageSearchParams = {
  mode?: string | string[];
  year?: string | string[];
  month?: string | string[];
  date?: string | string[];
  selectedPage?: string | string[];
  listPage?: string | string[];
};

type VirtualShopCalendarPageProps = {
  searchParams?: Promise<PageSearchParams>;
};

const CALENDAR_MONTH_NAMES = [
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

const PAGE_SIZE = 10;

const first = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

async function getJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed request: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export default async function VirtualShopCalendarPage({
  searchParams,
}: VirtualShopCalendarPageProps) {
  const now = new Date();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const session = await getServerSession(authOptions);
  const accessToken = session?.accessToken || "";

  const viewMode = first(resolvedSearchParams?.mode) === "list" ? "list" : "grid";
  const viewYear = toPositiveInt(first(resolvedSearchParams?.year), now.getFullYear());
  const month1Based = Math.min(
    Math.max(toPositiveInt(first(resolvedSearchParams?.month), now.getMonth() + 1), 1),
    12,
  );
  const viewMonth = month1Based - 1;
  const isCurrentMonth =
    viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const defaultDay = isCurrentMonth ? now.getDate() : 1;
  const selectedDate =
    first(resolvedSearchParams?.date) ||
    `${viewYear}-${String(month1Based).padStart(2, "0")}-${String(defaultDay).padStart(2, "0")}`;
  const selectedDatePage = toPositiveInt(first(resolvedSearchParams?.selectedPage), 1);
  const listPage = toPositiveInt(first(resolvedSearchParams?.listPage), 1);

  let monthCalendarResponse: { success: boolean; data: VirtualShopBookingCalendarItem[] } = {
    success: true,
    data: [],
  };
  let selectedDateResponse: VirtualShopServiceBookingListResponse = {
    success: true,
    meta: {
      totalRecords: 0,
      totalPages: 0,
      page: selectedDatePage,
      limit: PAGE_SIZE,
      hasNextPage: false,
      hasPrevPage: false,
    },
    data: [],
  };
  let monthListResponse: VirtualShopServiceBookingListResponse = {
    success: true,
    meta: {
      totalRecords: 0,
      totalPages: 0,
      page: listPage,
      limit: PAGE_SIZE,
      hasNextPage: false,
      hasPrevPage: false,
    },
    data: [],
  };

  if (accessToken) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

    if (viewMode === "grid") {
      const calendarUrl = new URL(`${baseUrl}/api/virtual-shop/service-booking/calendar`);
      calendarUrl.searchParams.set("year", String(viewYear));
      calendarUrl.searchParams.set("month", CALENDAR_MONTH_NAMES[viewMonth]);

      const selectedDateUrl = new URL(`${baseUrl}/api/virtual-shop/service-booking`);
      selectedDateUrl.searchParams.set("date", selectedDate);
      selectedDateUrl.searchParams.set("page", String(selectedDatePage));
      selectedDateUrl.searchParams.set("limit", String(PAGE_SIZE));
      selectedDateUrl.searchParams.set("sortOrder", "asc");

      const [calendarResult, selectedDateResult] = await Promise.allSettled([
        getJson<{ success: boolean; data: VirtualShopBookingCalendarItem[] }>(
          calendarUrl.toString(),
          accessToken,
        ),
        getJson<VirtualShopServiceBookingListResponse>(
          selectedDateUrl.toString(),
          accessToken,
        ),
      ]);

      if (calendarResult.status === "fulfilled") {
        monthCalendarResponse = calendarResult.value;
      }
      if (selectedDateResult.status === "fulfilled") {
        selectedDateResponse = selectedDateResult.value;
      }
    } else {
      const monthListUrl = new URL(`${baseUrl}/api/virtual-shop/service-booking`);
      monthListUrl.searchParams.set("startDate", monthStart);
      monthListUrl.searchParams.set("endDate", monthEnd);
      monthListUrl.searchParams.set("page", String(listPage));
      monthListUrl.searchParams.set("limit", String(PAGE_SIZE));
      monthListUrl.searchParams.set("sortOrder", "asc");

      const monthListResult = await getJson<VirtualShopServiceBookingListResponse>(
        monthListUrl.toString(),
        accessToken,
      ).catch(() => null);

      if (monthListResult) {
        monthListResponse = monthListResult;
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
