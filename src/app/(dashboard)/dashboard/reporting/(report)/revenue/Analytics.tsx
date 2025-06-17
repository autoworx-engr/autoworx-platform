import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import moment from "moment";
import { getServerSession } from "next-auth";
import RevenueBarChartContainer from "./chart/RevenueBarChartContainer";

type AnalyticsProps = {
  startDate?: string;
  endDate?: string;
};

export default async function Analytics({ startDate, endDate }: AnalyticsProps) {
  const session = await getServerSession(authOptions);
  
  // Use provided dates or default to last 30 days
  let formattedStartDate: string;
  let formattedEndDate: string;
  
  if (startDate && endDate) {
    formattedStartDate = moment(decodeURIComponent(startDate), "MM-DD-YYYY").format("YYYY-MM-DD");
    formattedEndDate = moment(decodeURIComponent(endDate), "MM-DD-YYYY").format("YYYY-MM-DD");
  } else {
    let last30Days = moment().subtract(30, "days");
    let today = moment();
    formattedStartDate = last30Days.format("YYYY-MM-DD");
    formattedEndDate = today.format("YYYY-MM-DD");
  }
  const last30DaysInvoice = await db.invoice.findMany({
    where: {
      companyId: session?.user.companyId,
      type: "Invoice",
      column: {
        companyId: session?.user?.companyId,
        title: "Delivered",
      },
      AND: [
        {
          createdAt: {
            gte: new Date(`${formattedStartDate}T00:00:00.000Z`), // Start of the day
            lte: new Date(`${formattedEndDate}T23:59:59.999Z`), // End of the day
          },
        },
      ],
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
      last30DaysInvoice
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
      const totalServiceCost = last30DaysInvoice.reduce((acc, invoice) => {
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
      <div className="min-w-2xl mx-10">
        <RevenueBarChartContainer data={lastMonthServiceCategoryRevenue} />
      </div>
    </div>
  );
}
