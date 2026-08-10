import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import moment, { Moment } from "moment-timezone";
import { getServerSession } from "next-auth";
import RevenueBarChartContainer from "./chart/RevenueBarChartContainer";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";

type AnalyticsProps = {
  startDate?: string;
  endDate?: string;
};

export default async function Analytics({
  startDate,
  endDate,
}: AnalyticsProps) {
  const { timezone } = (await getCompanyTimezone()) || {
    timezone: moment.tz.guess(),
  };
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  if (!companyId) return null;

  // Use provided dates or default to last 30 days
  let formattedStartDate: Moment | undefined;
  let formattedEndDate: Moment | undefined;

  if (startDate && endDate) {
    const decodedStartDate = decodeURIComponent(startDate);
    const decodedEndDate = decodeURIComponent(endDate);
    formattedStartDate = moment
      .tz(decodedStartDate, "MM/DD/YYYY", timezone)
      .startOf("day");
    // formattedStartDate = moment(
    //   decodeURIComponent(startDate),
    //   'MM-DD-YYYY'
    // ).format('YYYY-MM-DD');
    // formattedEndDate = moment(decodeURIComponent(endDate), 'MM-DD-YYYY').format(
    //   'YYYY-MM-DD'
    // );
    formattedEndDate = moment
      .tz(decodedEndDate, "MM/DD/YYYY", timezone)
      .endOf("day");
  } else {
    const last30Days = moment.tz(timezone).subtract(30, "days");
    const today = moment.tz(timezone);
    formattedStartDate = last30Days.startOf("day");
    formattedEndDate = today.endOf("day");
  }
  const column = await db.column.findFirst({
    where: {
      companyId,
      title: "Delivered",
    },
  });

  const deliveredInvoices = await db.invoice.findMany({
    where: {
      companyId,
      type: "Invoice",
      columnId: column?.id,
      AND:
        formattedStartDate && formattedEndDate
          ? [
              {
                deliveredAt: {
                  gte: formattedStartDate.toDate(), // Start of the day
                  lte: formattedEndDate.toDate(), // End of the day
                },
              },
            ]
          : undefined,
    },
    include: {
      invoiceItems: {
        include: {
          materials: {
            include: {
              category: true,
            },
          },
          service: {
            include: {
              category: true,
              Technician: true,
            },
          },
          labor: true,
        },
      },
      technician: {
        select: {
          amount: true,
        },
      },
    },
  });

  const serviceCategory = Array.from(
    new Set(
      deliveredInvoices
        .flatMap((invoice) => {
          return invoice.invoiceItems.map((item) => {
            return item?.service?.category?.name;
          });
        })
        .filter((service) => service !== undefined),
    ),
  );

  const lastMonthServiceCategoryRevenue = serviceCategory.reduce(
    (acc, category) => {
      const totalServiceCost = deliveredInvoices.reduce((acc, invoice) => {
        const invoiceItems = invoice.invoiceItems.filter(
          (item) => item?.service?.category?.name === category,
        );

        const serviceProfit = invoiceItems.reduce(
          (
            acc,
            item: Prisma.InvoiceItemGetPayload<{
              include: {
                materials: {
                  include: {
                    category: true;
                  };
                };
                service: {
                  include: {
                    category: true;
                  };
                };
                labor: true;
              };
            }>,
          ) => {
            const materialSellPrice = item.materials.reduce((acc, cur) => {
              const priceBeforeDiscount =
                Number(cur.sell) * Number(cur.quantity);
              const discount = Number(cur.discount) || 0;
              return acc + (priceBeforeDiscount - discount);
            }, 0);

            // Calculate labor cost
            const laborPriceBeforeDiscount =
              Number(item.labor?.charge || 0) * Number(item.labor?.hours || 0);
            const laborDiscount = Number(item.labor?.discount || 0);
            const laborCost = laborPriceBeforeDiscount - laborDiscount;
            //total service cost with discount
            const totalCost = materialSellPrice + laborCost;
            acc += totalCost;
            return acc;
          },
          0,
        );
        acc += serviceProfit;
        return acc;
      }, 0);
      acc.push({
        categoryName: category,
        salePrice: totalServiceCost,
      });
      return acc;
    },
    [] as { categoryName: string; salePrice: number }[],
  );

  return (
    <div className="rounded-lg border p-6">
      <h1 className="py-4 text-4xl font-bold">Analytics</h1>
      <div className="mx-5 md:mx-10 grid grid-cols-1 gap-x-10 md:gap-x-20">
        <RevenueBarChartContainer data={lastMonthServiceCategoryRevenue} />
      </div>
    </div>
  );
}
