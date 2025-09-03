import { authOptions } from "@/authOptions";
import { db } from "@/lib/db";
import { Invoice, Prisma } from "@prisma/client";
import moment from "moment-timezone";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import Calculation from "../../components/Calculation";
import CalculationWithTooltip from "../../components/CalculationWithTooltip";
import Analytics from "./Analytics";
import AnalyticsVisibility from "./AnalyticsVisibility";
import FilterHeader from "./FilterHeader";
import RevenueDisplay from "./RevenueDisplay";
import { FormatUtcToTimezone } from "@/utils/FormatUtcToTimezone";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { normalizeSearch } from "@/utils/normalizeSearch";

type TProps = {
  searchParams: {
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
  };
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
    invoiceItems: {
      include: {
        materials: true;
        labor: true;
      };
    };
    vehicle: {
      select: {
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

export default async function RevenueReportPage({ searchParams }: TProps) {
  const session = await getServerSession(authOptions);
  const { timezone } = (await getCompanyTimezone()) || {
    timezone: moment.tz.guess(),
  };
  const filterOR: any = [];

  const defaultTake = 50;
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const take = searchParams.take
    ? parseInt(searchParams.take, 10)
    : defaultTake;

  const invoicesPromise = db.invoice.findMany({
    where: {
      companyId: session?.user?.companyId,
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
                      name: searchParams.service?.trim(),
                      category: { name: searchParams.category },
                    },
                  },
                ],
              }
            : undefined,
      },
      OR: filterOR.length > 0 ? filterOR : undefined,
    },
    include: {
      invoiceItems: {
        include: {
          materials: true,
          labor: true,
        },
      },
      vehicle: {
        select: {
          make: true,
          model: true,
          submodel: true,
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
      companyId: session?.user?.companyId,
    },
    include: {
      category: true,
    },
  });

  const categoriesPromise = db.category.findMany({
    where: {
      companyId: session?.user?.companyId,
    },
  });

  const [invoices, services, categories] = await Promise.all([
    invoicesPromise,
    servicesPromise,
    categoriesPromise,
  ]);
  let filteredInvoicesWithOutDate: Invoice[] = [];
  let filteredInvoices =
    searchParams?.search && invoices
      ? invoices.filter((invoice) => {
          if (!invoice.client && !invoice.id) {
            return false;
          }

          const fullName = `${invoice?.client?.firstName} ${invoice?.client?.lastName}`;
          const vehicle = `${invoice.vehicle?.make} ${invoice.vehicle?.model} ${invoice.vehicle?.submodel}`;
          return (
            normalizeSearch(fullName)?.includes(
              normalizeSearch(searchParams?.search || "")
            ) ||
            normalizeSearch(invoice.id)?.includes(
              normalizeSearch(searchParams?.search || "")
            ) ||
            normalizeSearch(vehicle)?.includes(
              normalizeSearch(searchParams?.search || "")
            )
          );
        })
      : invoices;

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

    // console.log("formattedStartDate", convertedStart);
    // console.log("formattedEndDate", convertedEnd);
    // console.log("timezone", timezone);
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

    // filterOR.push({
    //   deliveredAt: {
    //     gte:
    //       formattedStartDate && new Date(`${formattedStartDate}T00:00:00.000Z`), // Start of the day
    //     lte: formattedEndDate && new Date(`${formattedEndDate}T23:59:59.999Z`), // End of the day
    //   },
    // });
  }

  const getService = services.map((service) => service.name);
  const getCategory = categories.map((category) => category.name);

  const maxPrice = Math.max(
    ...filteredInvoices.map((invoice) => Number(invoice.grandTotal))
  );

  let maxCost = 0;
  let maxProfit = 0;

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

    const { costPrice, profitPrice, materialLossAmount, laborLossAmount, materialLossDetails } = invoice.invoiceItems.reduce(
      (
        acc,
        cur: Prisma.InvoiceItemGetPayload<{
          include: {
            materials: true;
            labor: true;
          };
        }>
      ) => {
        const materialCostPrice = cur.materials.reduce(
          (acc, cur) =>
            acc + Number(cur?.cost || 0) * Number(cur?.quantity || 0),
          0
        );

        // Calculate material loss and track material names with losses
        const { totalMaterialLoss, lossDetails } = cur.materials.reduce((acc, material) => {
          const materialCost = Number(material?.cost || 0) * Number(material?.quantity || 0);
          const materialRevenue = (Number(material?.sell || 0) * Number(material?.quantity || 0)) - Number(material?.discount || 0);
          const loss = materialCost > materialRevenue ? materialCost - materialRevenue : 0;
          
          if (loss > 0) {
            acc.lossDetails.push({
              name: material.name,
              loss: loss,
              isFromInventory: !!material.productId
            });
          }
          
          acc.totalMaterialLoss += loss;
          return acc;
        }, { totalMaterialLoss: 0, lossDetails: [] as { name: string; loss: number; isFromInventory: boolean }[] });

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
        materialLossDetails: [] as { name: string; loss: number; isFromInventory: boolean }[],
      }
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
    maxCost = Math.max(maxCost, costPrice);
    maxProfit = Math.max(maxProfit, profitPrice);
    if (!searchParams.price && !searchParams.cost && !searchParams.profit) {
      return true;
    }
    // filter by price of invoice
    if (searchParams.price) {
      const [minPrice, maxPrice] = searchParams.price.split("-").map(Number);
      if (
        Number(invoice?.grandTotal) >= minPrice &&
        Number(invoice?.grandTotal) <= maxPrice
      ) {
        return true;
      }
    }
    // filter by cost of invoice
    if (searchParams.cost) {
      const [minCost, maxCost] = searchParams.cost.split("-").map(Number);
      if (costPrice >= minCost && costPrice <= maxCost) {
        return true;
      }
    }
    // filter by profit of invoice
    if (searchParams.profit) {
      const [minProfit, maxProfit] = searchParams.profit.split("-").map(Number);
      if (profitPrice >= minProfit && profitPrice <= maxProfit) {
        return true;
      }
    }
  });

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
    0
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
    0
  );

  // Calculate the all time profit (Invoice has a `profit` field)
  const totalProfit = invoices.reduce(
    (total, invoice) => total + Number((invoice as Invoice).grandTotal || 0),
    0
  );

  // Calculate total revenue (sum of profits) for all invoices
  const totalRevenue = filteredInvoice.reduce(
    (total, invoice) => total + Number((invoice as Invoice).grandTotal || 0),
    0
  );

  // Calculate filtered revenue only when date range is applied
  let filteredRevenue =
    searchParams?.startDate && searchParams?.endDate
      ? filteredInvoice.reduce(
          (total, invoice) =>
            total + Number((invoice as Invoice).grandTotal || 0),
          0
        )
      : totalRevenue; // Use total revenue when no date filter

  let getFilteredCategoryId = categories.find(
    (category) => category.name === searchParams.category
  )?.id;

  //filter based on the filterRevenue query
  filteredRevenue = searchParams?.filterRevenue
    ? filteredInvoice.reduce((total, invoice) => {
        if (searchParams?.filterRevenue === "Price") {
          return total + Number(invoice.grandTotal?.toString() || 0);
        } else if (searchParams?.filterRevenue === "Cost") {
          return total + (Number((invoice as any)?.costPrice) || 0);
        } else if (searchParams?.filterRevenue === "Profit") {
          return total + Number((invoice as any).profitPrice.toString());
        }
        return total;
      }, 0)
    : totalRevenue;

  if (searchParams.category) {
    let filteredInvoiceItems = [];

    for (const invoice of filteredInvoices) {
      for (const item of invoice.invoiceItems) {
        let serviceId: any = item?.serviceId;
        if (serviceId) {
          const services = await db.service.findMany({
            where: {
              categoryId: getFilteredCategoryId,
              id: serviceId,
              companyId: session?.user?.companyId,
            },
            select: {
              id: true,
            },
          });
          for (const service of services) {
            if (service.id === serviceId) {
              filteredInvoiceItems.push(item);
            }
          }
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
    let filteredInvoiceItems = [];

    // Find the service ID for the selected service name
    const selectedService = services.find(
      (service) => service.name === searchParams.service?.trim()
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
      filteredRevenue = totalMaterialCost + totalLaborCost;
    } else {
      // If service not found, set filtered revenue to 0
      filteredRevenue = 0;
    }
  }

  return (
    <div className="space-y-5">
      <div className="my-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
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
          filteredInvoice as (TInvoice & {
            costPrice: number;
            profitPrice: number;
            inventoryLossAmount: number;
            materialLossAmount: number;
            laborLossAmount: number;
            totalLossAmount: number;
            materialLossDetails: { name: string; loss: number; isFromInventory: boolean }[];
          })[]
        }
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
