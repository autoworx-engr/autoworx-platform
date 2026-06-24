import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { authOptions } from "@/authOptions";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { Invoice, Prisma, Refund } from "@prisma/client";
import moment from "moment-timezone";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import Calculation from "../../components/Calculation";
import CalculationWithTooltip from "../../components/CalculationWithTooltip";
import Analytics from "./Analytics";
import AnalyticsVisibility from "./AnalyticsVisibility";
import FilterHeader from "./FilterHeader";
import RevenueDisplay from "./RevenueDisplay";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics - Revenue",
  description: "Analyze your shop's revenue and profitability",
};

type TProps = {
  searchParams: Promise<{
    category?: string;
    startDate?: string;
    endDate?: string;
    service?: string;
    search?: string;
    price?: string;
    cost?: string;
    profit?: string;
    filterRevenue?: string;
    page?: string;
    take?: string;
  }>;
};

export type TSliderData = {
  id: number;
  min: number;
  max: number;
  defaultValue?: [number, number];
  type: "price" | "cost" | "profit";
};

export type TInvoice = Prisma.InvoiceGetPayload<{
  include: {
    Refund: true;
    invoiceItems: {
      include: {
        materials: true;
        labor: true;
      };
    };
    vehicle: {
      select: {
        year: true;
        make: true;
        model: true;
        submodel: true;
        other: true;
      };
    };
    client: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
      };
    };
    technician: true;
    InventoryProductHistory: {
      include: { product: { select: { name: true } } };
    };
  };
}>;

export default async function RevenueReportPage(props: TProps) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;
  if (!companyId) throw new Error("Unauthorized");
  const { timezone } = (await getCompanyTimezone()) || {
    timezone: moment.tz.guess(),
  };

  const ci = (value: string): Prisma.StringFilter => ({
    contains: value,
    mode: "insensitive",
  });

  const searchTerm = searchParams.search?.trim();

  const buildVehicleCombinations = (
    term: string,
  ): Prisma.InvoiceWhereInput[] => {
    if (!term.includes(" ")) return [];
    const parts = term.split(/\s+/);
    const results: Prisma.InvoiceWhereInput[] = [];
    const yearNum = /^\d{4}$/.test(parts[0]) ? parseInt(parts[0], 10) : null;
    const rest = yearNum !== null ? parts.slice(1) : parts;

    for (let i = 1; i < rest.length; i++) {
      const make = rest.slice(0, i).join(" ");
      const model = rest.slice(i).join(" ");
      const andClauses =
        yearNum !== null
          ? [{ year: yearNum }, { make: ci(make) }, { model: ci(model) }]
          : [{ make: ci(make) }, { model: ci(model) }];
      results.push({
        vehicle: { is: { AND: andClauses } },
      } as Prisma.InvoiceWhereInput);
    }

    if (yearNum !== null && rest.length > 0) {
      const restStr = rest.join(" ");
      results.push({
        vehicle: { is: { AND: [{ year: yearNum }, { make: ci(restStr) }] } },
      } as Prisma.InvoiceWhereInput);
      results.push({
        vehicle: { is: { AND: [{ year: yearNum }, { model: ci(restStr) }] } },
      } as Prisma.InvoiceWhereInput);
    }

    return results;
  };

  const buildClientNameFilter = (term: string): Prisma.InvoiceWhereInput[] => {
    const [first, ...rest] = term.split(/\s+/);
    const last = rest.join(" ");
    if (!first || !last) return [];
    return [
      {
        client: {
          is: { AND: [{ firstName: ci(first) }, { lastName: ci(last) }] },
        },
      } as Prisma.InvoiceWhereInput,
    ];
  };

  const searchFilter: Prisma.InvoiceWhereInput | undefined = searchTerm
    ? {
        OR: [
          { id: ci(searchTerm) },
          { client: { is: { firstName: ci(searchTerm) } } },
          { client: { is: { lastName: ci(searchTerm) } } },
          { vehicle: { is: { make: ci(searchTerm) } } },
          { vehicle: { is: { model: ci(searchTerm) } } },
          { vehicle: { is: { submodel: ci(searchTerm) } } },
          { vehicle: { is: { other: ci(searchTerm) } } },
          ...buildVehicleCombinations(searchTerm),
          ...buildClientNameFilter(searchTerm),
        ],
      }
    : undefined;

  const defaultTake = 50;
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const take = searchParams.take
    ? parseInt(searchParams.take, 10)
    : defaultTake;

  const invoicesPromise = db.invoice.findMany({
    where: {
      companyId,
      type: "Invoice",
      column: {
        companyId: session?.user?.companyId,
        title: "Delivered",
      },
      invoiceItems: {
        some:
          searchParams.category || searchParams.service
            ? {
                OR: [
                  {
                    service: {
                      OR: [
                        {
                          name: searchParams.service?.trim(),
                        },
                        {
                          category: { name: searchParams.category },
                        },
                      ],
                    },
                  },
                ],
              }
            : undefined,
      },
      ...(searchFilter || {}),
    },
    include: {
      Refund: true,
      invoiceItems: {
        include: {
          materials: true,
          labor: true,
        },
      },
      vehicle: {
        select: {
          year: true,
          make: true,
          model: true,
          submodel: true,
          other: true,
        },
      },
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      technician: true,
      InventoryProductHistory: {
        where: {
          isLost: true,
        },
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      deliveredAt: "desc",
    },
  });

  const servicesPromise = db.service.findMany({
    where: {
      companyId,
    },
    include: {
      category: true,
    },
  });

  const categoriesPromise = db.category.findMany({
    where: {
      companyId,
    },
  });

  const [invoices, services, categories] = await Promise.all([
    invoicesPromise,
    servicesPromise,
    categoriesPromise,
  ]);

  let filteredInvoicesWithOutDate: TInvoice[] = [];
  let filteredInvoices = invoices;

  if (searchParams.startDate && searchParams.endDate) {
    const formattedStartDate = searchParams.startDate
      ? decodeURIComponent(searchParams.startDate!) // e.g. "05/01/2025"
      : null;

    const formattedEndDate = searchParams.endDate
      ? decodeURIComponent(searchParams.endDate!)
      : null;

    const convertedStart = formattedStartDate
      ? moment.tz(formattedStartDate!, "MM/DD/YYYY", timezone).startOf("day")
      : null;

    const convertedEnd = formattedEndDate
      ? moment.tz(formattedEndDate!, "MM/DD/YYYY", timezone).endOf("day")
      : null;
    filteredInvoicesWithOutDate = filteredInvoices;

    filteredInvoices = filteredInvoices.filter((invoice) => {
      if (!invoice.deliveredAt) {
        return false;
      }

      const invoiceDate = invoice.deliveredAt
        ? moment.utc(invoice.deliveredAt)
        : null;
      return (
        invoiceDate &&
        invoiceDate.isBetween(convertedStart, convertedEnd, null, "[]")
      );
    });
  }

  const getService = services
    .map((service) => service.name.trim())
    .filter((name) => name.length > 0);
  const getCategory = categories
    .map((category) => category.name.trim())
    .filter((name) => name.length > 0);
  const maxPrice = filteredInvoices.reduce(
    (max, invoice) => Math.max(max, Number(invoice.grandTotal)),
    0,
  );

  const filteredInvoice = filteredInvoices.filter((invoice) => {
    const laborCost = invoice?.technician.reduce((acc, technician) => {
      acc += Number(technician?.amount);
      return acc;
    }, 0);

    // Calculate inventory losses (lost products from inventory)
    // const inventoryLossAmount = invoice.InventoryProductHistory?.reduce(
    //   (total, item) => total + Number(item.price) * Number(item.quantity),
    //   0
    // ) || 0;
    const inventoryLossAmount = 0;

    const {
      costPrice,
      profitPrice,
      materialLossAmount,
      laborLossAmount,
      materialLossDetails,
    } = invoice.invoiceItems.reduce(
      (
        acc,
        cur: Prisma.InvoiceItemGetPayload<{
          include: {
            materials: true;
            labor: true;
          };
        }>,
      ) => {
        const materialCostPrice = cur.materials.reduce(
          (acc, cur) =>
            acc + Number(cur?.cost || 0) * Number(cur?.quantity || 0),
          0,
        );

        // Calculate material loss and track material names with losses
        const { totalMaterialLoss, lossDetails } = cur.materials.reduce(
          (acc, material) => {
            const materialCost =
              Number(material?.cost || 0) * Number(material?.quantity || 0);
            const materialRevenue =
              Number(material?.sell || 0) * Number(material?.quantity || 0) -
              Number(material?.discount || 0);
            const loss =
              materialCost > materialRevenue
                ? materialCost - materialRevenue
                : 0;

            if (loss > 0) {
              acc.lossDetails.push({
                name: material.name,
                loss: loss,
                isFromInventory: !!material.productId,
              });
            }

            acc.totalMaterialLoss += loss;
            return acc;
          },
          {
            totalMaterialLoss: 0,
            lossDetails: [] as {
              name: string;
              loss: number;
              isFromInventory: boolean;
            }[],
          },
        );

        // Calculate labor loss (when technician amount > labor charge)
        // let laborLoss = 0;
        // if (cur.labor) {
        //   const laborRevenue = (Number(cur.labor.charge || 0) * Number(cur.labor.hours || 0)) - Number(cur.labor.discount || 0);
        //   // Find technician costs for this labor
        //   const technicianCosts = invoice.technician
        //     .filter(tech => tech.invoiceItemId === cur.id)
        //     .reduce((sum, tech) => sum + Number(tech.amount || 0), 0);
        //
        //   laborLoss = technicianCosts > laborRevenue ? technicianCosts - laborRevenue : 0;
        // }
        const laborLoss = 0;

        const costPrice = materialCostPrice;
        acc.costPrice += costPrice;
        acc.materialLossAmount += totalMaterialLoss;
        acc.laborLossAmount += laborLoss;
        acc.materialLossDetails.push(...lossDetails);
        return acc;
      },
      {
        costPrice: 0,
        profitPrice: 0,
        materialLossAmount: 0,
        laborLossAmount: 0,
        materialLossDetails: [] as {
          name: string;
          loss: number;
          isFromInventory: boolean;
        }[],
      },
    );

    // Calculate total costs and profit correctly
    const totalCostPrice = costPrice + laborCost;
    // const totalLossAmount = inventoryLossAmount + materialLossAmount + laborLossAmount;
    const totalLossAmount = materialLossAmount; // Only material loss

    // Profit = Revenue - Total Costs
    const finalProfitPrice = Number(invoice.grandTotal) - totalCostPrice;

    (invoice as any).costPrice = totalCostPrice;
    (invoice as any).profitPrice = finalProfitPrice;
    (invoice as any).inventoryLossAmount = inventoryLossAmount;
    (invoice as any).materialLossAmount = materialLossAmount;
    (invoice as any).laborLossAmount = laborLossAmount;
    (invoice as any).totalLossAmount = totalLossAmount;
    (invoice as any).materialLossDetails = materialLossDetails;

    if (searchParams.filterRevenue === "Profit" && finalProfitPrice <= 0) {
      return false;
    }

    if (!searchParams.price && !searchParams.cost && !searchParams.profit) {
      return true;
    }

    let matches = true;

    if (searchParams.price) {
      const [minPrice, maxPrice] = searchParams.price.split("-").map(Number);
      matches =
        matches &&
        Number(invoice?.grandTotal) >= minPrice &&
        Number(invoice?.grandTotal) <= maxPrice;
    }

    if (searchParams.cost) {
      const [minCost, maxCost] = searchParams.cost.split("-").map(Number);
      matches =
        matches && totalCostPrice >= minCost && totalCostPrice <= maxCost;
    }

    if (searchParams.profit) {
      const [minProfit, maxProfit] = searchParams.profit.split("-").map(Number);
      matches =
        matches &&
        finalProfitPrice >= minProfit &&
        finalProfitPrice <= maxProfit;
    }

    return matches;
  });

  const maxCost = filteredInvoices.reduce(
    (max, invoice) => Math.max(max, Number((invoice as any).costPrice || 0)),
    0,
  );
  const maxProfit = filteredInvoices.reduce(
    (max, invoice) => Math.max(max, Number((invoice as any).profitPrice || 0)),
    0,
  );

  // multiple filters
  const filterMultipleSliders: TSliderData[] = [
    {
      id: 1,
      type: "price",
      min: 0,
      max: maxPrice,
      // defaultValue: [50, 250],
    },
    {
      id: 2,
      type: "cost",
      min: 0,
      max: maxCost,
    },
    {
      id: 3,
      type: "profit",
      min: 0,
      max: maxProfit,
    },
  ];

  // Calculate the total week profit (Invoice has a `profit` field)
  const now = moment.tz(timezone);

  // Start of the week (Sunday)
  const startOfWeek = now.clone().startOf("week");

  // End of the week (Saturday)
  const endOfWeek = now.clone().endOf("week");

  const weeklyInvoices = (
    searchParams.startDate && searchParams.endDate
      ? filteredInvoicesWithOutDate
      : filteredInvoices
  ).filter((invoice) => {
    if (!invoice.deliveredAt) return false;

    const deliveredAt = moment.tz(invoice.deliveredAt, timezone);

    return (
      deliveredAt.isSameOrAfter(startOfWeek) &&
      deliveredAt.isSameOrBefore(endOfWeek)
    );
  });

  const totalWeekProfit = weeklyInvoices.reduce(
    (total, invoice) => total + Number((invoice as Invoice).grandTotal || 0),
    0,
  );

  // Calculate the total month profit (Invoice has a `profit` field)
  // Start and end of the current month
  const startOfMonth = now.clone().startOf("month");
  const endOfMonth = now.clone().endOf("month");

  // Filter invoices within the current month
  const monthlyInvoices = (
    searchParams.startDate && searchParams.endDate
      ? filteredInvoicesWithOutDate
      : filteredInvoices
  ).filter((invoice) => {
    if (!invoice.deliveredAt) return false;

    const deliveredAt = moment.tz(invoice.deliveredAt, timezone);

    return (
      deliveredAt.isSameOrAfter(startOfMonth) &&
      deliveredAt.isSameOrBefore(endOfMonth)
    );
  });

  const totalMonthProfit = monthlyInvoices.reduce(
    (total, invoice) => total + Number((invoice as Invoice).grandTotal || 0),
    0,
  );

  // Calculate the all time profit (Invoice has a `profit` field)
  const totalProfit = invoices.reduce(
    (total, invoice) => total + Number((invoice as Invoice).grandTotal || 0),
    0,
  );

  // Calculate total revenue (sum of profits) for all invoices
  const totalRevenue = filteredInvoice.reduce(
    (total, invoice) => total + Number((invoice as Invoice).grandTotal || 0),
    0,
  );

  // Calculate filtered revenue only when date range is applied
  let filteredRevenue =
    searchParams?.startDate && searchParams?.endDate
      ? filteredInvoice.reduce(
          (total, invoice) =>
            total + Number((invoice as Invoice).grandTotal || 0),
          0,
        )
      : totalRevenue; // Use total revenue when no date filter

  let getFilteredCategoryId = categories.find(
    (category) => category.name === searchParams.category,
  )?.id;

  let filterByValue = 0;

  //filter based on the filterRevenue query - use the filtered invoice data
  if (searchParams?.filterRevenue) {
    filterByValue = filteredInvoice.reduce((total, invoice) => {
      if (searchParams?.filterRevenue === "Price") {
        return total + Number(invoice.grandTotal?.toString() || 0);
      } else if (searchParams?.filterRevenue === "Cost") {
        return total + (Number((invoice as any)?.costPrice) || 0);
      } else if (searchParams?.filterRevenue === "Profit") {
        // Only sum positive profits since we've already filtered out losses
        const refundedAmount =
          invoice?.Refund?.reduce(
            (acc, refund) => acc.plus(refund.amount || new Prisma.Decimal(0)),
            new Prisma.Decimal(0),
          ) || new Prisma.Decimal(0);

        const totalProfit =
          Number((invoice as any).profitPrice) - Number(refundedAmount);
        const profit = Number(totalProfit?.toString());

        return total + (profit > 0 ? profit : 0);
      }
      return total;
    }, 0);
  }

  if (searchParams.category) {
    let filteredInvoiceItems = [];

    const categoryServiceIds = new Set(
      services
        .filter((service) => service.categoryId === getFilteredCategoryId)
        .map((service) => service.id),
    );

    for (const invoice of filteredInvoices) {
      for (const item of invoice.invoiceItems) {
        let serviceId: any = item?.serviceId;
        if (serviceId && categoryServiceIds.has(serviceId)) {
          filteredInvoiceItems.push(item);
        }
      }
    }
    // Calculate total material cost and labor cost for filtered invoic
    let totalMaterialCost = 0;
    let totalLaborCost = 0;

    filteredInvoiceItems.forEach((item: any) => {
      if (item.labor) {
        totalLaborCost +=
          item.labor.hours * item.labor.charge - item.labor.discount;
      }

      item.materials.forEach((material: any) => {
        const materialCost =
          material.quantity * material.sell - material.discount;
        totalMaterialCost += materialCost;
      });
    });
    filteredRevenue = totalMaterialCost + totalLaborCost;
  }

  if (searchParams.service) {
    // If category is not specified, set filteredRevenue to 0
    if (!searchParams.category) {
      filteredRevenue = 0;
    }
    let filteredInvoiceItems = [];

    // Find the service ID for the selected service name
    const selectedService = services.find(
      (service) => service.name === searchParams.service?.trim(),
    );

    if (selectedService) {
      // Loop through filtered invoices to find invoice items with the selected service
      for (const invoice of filteredInvoices) {
        for (const item of invoice.invoiceItems) {
          if (item.serviceId === selectedService.id) {
            filteredInvoiceItems.push(item);
          }
        }
      }

      // Calculate total material cost and labor cost for filtered invoice items
      let totalMaterialCost = 0;
      let totalLaborCost = 0;

      filteredInvoiceItems.forEach((item: any) => {
        // Calculate labor cost
        if (item.labor) {
          totalLaborCost +=
            item.labor.hours * item.labor.charge - item.labor.discount;
        }

        // Calculate material cost
        item.materials.forEach((material: any) => {
          const materialCost =
            material.quantity * material.sell - material.discount;
          totalMaterialCost += materialCost;
        });
      });
      // Set filtered revenue to the sum of material and labor costs for the selected service
      filteredRevenue = filteredRevenue + (totalMaterialCost + totalLaborCost);
    } else {
      // If service not found, set filtered revenue to 0
      filteredRevenue = 0;
    }
  }

  const filteredTotalCount = filteredInvoice.length;
  const startIndex = (page - 1) * take;
  const paginatedFilteredInvoice = filteredInvoice.slice(
    startIndex,
    startIndex + take,
  );

  return (
    <div className="space-y-5">
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 gap-4",
          searchParams.filterRevenue ? "lg:grid-cols-5" : "lg:grid-cols-4",
        )}
      >
        <Calculation content="WEEK" amount={totalWeekProfit} />
        <Calculation content="MONTH" amount={totalMonthProfit} />
        <Calculation content="YTD" amount={totalProfit} />
        <CalculationWithTooltip
          content="REVENUE (FILTERED)"
          amount={filteredRevenue}
          hasDateRange={!!(searchParams?.startDate && searchParams?.endDate)}
          startDate={
            searchParams?.startDate
              ? decodeURIComponent(searchParams.startDate)
              : undefined
          }
          endDate={
            searchParams?.endDate
              ? decodeURIComponent(searchParams.endDate)
              : undefined
          }
        />
        {searchParams?.filterRevenue && (
          <Calculation
            content={searchParams.filterRevenue?.toUpperCase()}
            amount={filterByValue}
          />
        )}
      </div>
      {/* filter section */}
      <FilterHeader
        searchParams={searchParams}
        filterMultipleSliders={filterMultipleSliders}
        getCategory={getCategory}
        getService={getService}
      />
      {/* Conditional Rendering Based on Device */}
      <RevenueDisplay
        filteredInvoice={
          paginatedFilteredInvoice as (TInvoice & {
            refund: Refund;
            costPrice: number;
            profitPrice: number;
            inventoryLossAmount: number;
            materialLossAmount: number;
            laborLossAmount: number;
            totalLossAmount: number;
            materialLossDetails: {
              name: string;
              loss: number;
              isFromInventory: boolean;
            }[];
          })[]
        }
        total={filteredTotalCount}
        timezone={timezone}
        page={page}
        take={take}
      />{" "}
      {/* Analytics will only be loaded and rendered on desktop */}
      <Suspense fallback="loading...">
        <AnalyticsVisibility>
          <Analytics
            startDate={searchParams.startDate}
            endDate={searchParams.endDate}
          />
        </AnalyticsVisibility>
      </Suspense>
    </div>
  );
}
