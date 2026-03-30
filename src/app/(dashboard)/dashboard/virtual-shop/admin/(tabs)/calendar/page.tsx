import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import type {
  VirtualShopBookingCalendarItem,
  VirtualShopServiceBookingListResponse,
} from "@/service/virtual-shop/api";
import type { Prisma } from "@prisma/client";
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

const PAGE_SIZE = 10;

const first = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

function buildMeta(totalRecords: number, page: number, limit: number) {
  const totalPages = Math.ceil(totalRecords / limit);

  return {
    totalRecords,
    totalPages,
    page,
    limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

function mapShopBookingsToResponseData(
  shopBookings: Array<{
    id: number;
    status: string;
    appointment: {
      date: Date | null;
      startTime: string | null;
      endTime: string | null;
    } | null;
    client: {
      firstName: string;
      lastName: string | null;
      email: string | null;
      mobile: string | null;
    } | null;
    vehicle: {
      year: number | null;
      make: string | null;
      model: string | null;
    } | null;
    invoice: {
      subtotal: unknown;
      tax: unknown;
      serviceFee: unknown;
      grandTotal: unknown;
      vehicleExtraCost: unknown;
      deposit: unknown;
      due: unknown;
    } | null;
    shop: {
      bookingSettings: {
        isDepositEnabled: boolean;
        depositType: "FIXED" | "PERCENTAGE" | null;
        depositValue: unknown;
      } | null;
    };
    services: Array<{
      title: string;
      price: unknown;
      duration: number;
      modifierType: string | null;
      modifierPrice: unknown;
    }>;
  }>,
) {
  return shopBookings.map((sb) => {
    const subtotal = Number(sb.invoice?.subtotal || 0);
    const taxRate = Number(sb.invoice?.tax || 0);
    const vehicleExtraCost = Number(sb.invoice?.vehicleExtraCost || 0);
    const serviceFeeAmount = Number(sb.invoice?.serviceFee || 0);
    const grandTotal = Number(sb.invoice?.grandTotal || 0);

    const totalServiceCost = subtotal - vehicleExtraCost;
    const taxAmount = (totalServiceCost * taxRate) / 100;

    const isDepositEnabled = Boolean(sb.shop?.bookingSettings?.isDepositEnabled);
    const depositType = sb.shop?.bookingSettings?.depositType;
    const depositValue = Number(sb.shop?.bookingSettings?.depositValue || 0);
    const depositRequired = !isDepositEnabled
      ? 0
      : depositType === "PERCENTAGE"
        ? Number(((grandTotal * depositValue) / 100).toFixed(2))
        : depositValue;

    return {
      id: sb.id,
      status: sb.status.toLowerCase(),
      subtotal,
      tax: taxAmount,
      serviceFee: serviceFeeAmount,
      total: grandTotal,
      depositRequired,
      depositPaid: Number(sb.invoice?.deposit || 0),
      balanceDue: Number(sb.invoice?.due || 0),
      appointment: sb.appointment
        ? {
          date: sb.appointment.date ? sb.appointment.date.toISOString() : "",
          startTime: sb.appointment.startTime,
          endTime: sb.appointment.endTime,
        }
        : null,
      client: sb.client
        ? {
          firstName: sb.client.firstName,
          lastName: sb.client.lastName,
          email: sb.client.email,
          mobile: sb.client.mobile,
        }
        : null,
      vehicle: sb.vehicle
        ? {
          year: sb.vehicle.year,
          make: sb.vehicle.make,
          model: sb.vehicle.model,
        }
        : null,
      services: sb.services.map((srv) => ({
        title: srv.title,
        price: Number(srv.price),
        duration: srv.duration,
        modifierType: srv.modifierType,
        modifierPrice: Number(srv.modifierPrice),
      })),
    };
  });
}

export default async function VirtualShopCalendarPage({
  searchParams,
}: VirtualShopCalendarPageProps) {
  const now = new Date();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;

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

  if (companyId) {
    const monthStart = new Date(viewYear, viewMonth, 1);
    const monthEnd = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59, 999);

    const baseWhere: Prisma.ShopBookingWhereInput = {
      shop: {
        companyId,
      },
    };

    if (viewMode === "grid") {
      const selectedDateStart = new Date(`${selectedDate}T00:00:00`);
      const selectedDateEnd = new Date(`${selectedDate}T23:59:59.999`);

      const calendarWhere: Prisma.ShopBookingWhereInput = {
        ...baseWhere,
        appointment: {
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      };

      const selectedWhere: Prisma.ShopBookingWhereInput = {
        ...baseWhere,
        appointment: {
          date: {
            gte: selectedDateStart,
            lte: selectedDateEnd,
          },
        },
      };

      const [calendarRows, selectedTotalRecords, selectedRows] = await db.$transaction([
        db.shopBooking.findMany({
          where: calendarWhere,
          select: {
            id: true,
            status: true,
            appointment: {
              select: {
                date: true,
                startTime: true,
                endTime: true,
              },
            },
            client: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        }),
        db.shopBooking.count({ where: selectedWhere }),
        db.shopBooking.findMany({
          where: selectedWhere,
          include: {
            shop: {
              select: {
                bookingSettings: {
                  select: {
                    isDepositEnabled: true,
                    depositType: true,
                    depositValue: true,
                  },
                },
              },
            },
            client: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                mobile: true,
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
                deposit: true,
                due: true,
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
          },
          orderBy: {
            createdAt: "asc",
          },
          skip: (selectedDatePage - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
      ]);

      monthCalendarResponse = {
        success: true,
        data: calendarRows.map((row) => ({
          id: row.id,
          status: row.status.toLowerCase(),
          appointment: row.appointment
            ? {
              date: row.appointment.date ? row.appointment.date.toISOString() : "",
              startTime: row.appointment.startTime,
              endTime: row.appointment.endTime,
            }
            : null,
          client: row.client
            ? {
              firstName: row.client.firstName,
              lastName: row.client.lastName,
            }
            : null,
        })),
      };

      selectedDateResponse = {
        success: true,
        meta: buildMeta(selectedTotalRecords, selectedDatePage, PAGE_SIZE),
        data: mapShopBookingsToResponseData(selectedRows),
      };
    } else {
      const monthWhere: Prisma.ShopBookingWhereInput = {
        ...baseWhere,
        appointment: {
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      };

      const [monthTotalRecords, monthRows] = await db.$transaction([
        db.shopBooking.count({ where: monthWhere }),
        db.shopBooking.findMany({
          where: monthWhere,
          include: {
            shop: {
              select: {
                bookingSettings: {
                  select: {
                    isDepositEnabled: true,
                    depositType: true,
                    depositValue: true,
                  },
                },
              },
            },
            client: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                mobile: true,
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
                deposit: true,
                due: true,
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
          },
          orderBy: {
            createdAt: "asc",
          },
          skip: (listPage - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
      ]);

      monthListResponse = {
        success: true,
        meta: buildMeta(monthTotalRecords, listPage, PAGE_SIZE),
        data: mapShopBookingsToResponseData(monthRows),
      };
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
