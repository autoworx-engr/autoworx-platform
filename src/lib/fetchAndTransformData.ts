"use server";
import { InvoiceType } from "@prisma/client";
import { db } from "./db";
import moment from "moment-timezone";

const defaultTake = 50;

export async function fetchAndTransformData(
  type: InvoiceType,
  companyId: number,
  searchParams: {
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: string;
    searchTerm?: string;
    take?: string;
  } = {},
  timezone: string
) {
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;

  const take = searchParams.take
    ? parseInt(searchParams.take, 10)
    : defaultTake;

  const { startDate, endDate, status, searchTerm } = searchParams;

  const formattedStartDate = searchParams.startDate
    ? decodeURIComponent(searchParams.startDate!) // e.g. "05/01/2025"
    : null;

  const formattedEndDate = searchParams.endDate
    ? decodeURIComponent(searchParams.endDate!)
    : null;

  const convertedStart = formattedStartDate
    ? moment.tz(formattedStartDate, "YYYY-MM-DD", timezone).startOf("day")
    : null;

  const convertedEnd = formattedEndDate
    ? moment.tz(formattedEndDate, "YYYY-MM-DD", timezone).endOf("day")
    : null;

  const decodedSearchTerm = decodeURIComponent(searchTerm || "").trim();
  const decodedStatus = decodeURIComponent(status || "");

  const statusIds = decodedStatus
    ? decodedStatus
        .split(",")
        .map((id) => {
          if (isNaN(Number(id))) {
            return undefined;
          } else {
            return Number(id);
          }
        })
        .filter((id) => id !== undefined)
    : undefined;

  if (isNaN(take) || isNaN(page)) {
    return {
      totalEstimate: 0,
      data: [],
    };
  }

  console.log("Decoded Status:", decodedSearchTerm);

  const searchConditionOR = decodedSearchTerm
    ? (() => {
        const searchTerms = decodedSearchTerm
          .toLowerCase()
          .split(/\s+/)
          .filter((term) => term.length > 0);
        console.log("Search Terms:", searchTerms);
        const yearNum = parseInt(decodedSearchTerm, 10);
        const isValidYear = !isNaN(yearNum) && yearNum > 1900 && yearNum < 2100;

        const clientSearchField = ["firstName", "lastName", "email", "mobile"];

        const vehicleSearchField = ["make", "model"];

        return [
          // Search by invoice ID
          {
            id: {
              contains: decodedSearchTerm,
            },
          },
          // Search by client info
          {
            client: {
              OR: [
                ...clientSearchField.map((field) => ({
                  [field]: {
                    contains: decodedSearchTerm,
                    mode: "insensitive",
                  },
                })),
                // capitalize first letter
                ...clientSearchField.map((field) => ({
                  [field]: {
                    contains: decodedSearchTerm
                      .split(" ")
                      .map(
                        (text) => text.charAt(0).toUpperCase() + text.slice(1)
                      )
                      .join(" "),
                    mode: "insensitive",
                  },
                })),
                ...clientSearchField.map((field) => ({
                  [field]: {
                    contains: decodedSearchTerm.toUpperCase(),
                    mode: "insensitive",
                  },
                })),
                // Match any search term in any client field
                ...(searchTerms.length > 0
                  ? [
                      {
                        OR: searchTerms.flatMap((term) => [
                          { firstName: { contains: term } },
                          { lastName: { contains: term } },
                          { email: { contains: term } },
                          { mobile: { contains: term } },
                        ]),
                      },
                    ]
                  : []),
              ],
            },
          },
          // Search by vehicle - COUNT QUERY FLEXIBLE MULTI-TERM
          {
            vehicle: {
              OR: [
                // Single term searches - ONLY if exactly one term
                ...(searchTerms.length === 1
                  ? [
                      ...vehicleSearchField.map((field) => ({
                        [field]: {
                          contains: decodedSearchTerm,
                          mode: "insensitive",
                        },
                      })),
                      // capitalize first letter
                      ...vehicleSearchField.map((field) => ({
                        [field]: {
                          contains:
                            decodedSearchTerm.charAt(0).toUpperCase() +
                            decodedSearchTerm.slice(1),
                          mode: "insensitive",
                        },
                      })),
                      ...vehicleSearchField.map((field) => ({
                        [field]: {
                          contains: decodedSearchTerm.toUpperCase(),
                          mode: "insensitive",
                        },
                      })),
                      ...(isValidYear
                        ? [
                            {
                              year: {
                                equals: yearNum,
                              },
                            },
                          ]
                        : []),
                    ]
                  : []),

                // Multi-term search - FLEXIBLE LOGIC
                ...(searchTerms.length > 1
                  ? (() => {
                      // Separate year terms from non-year terms
                      const yearTerms = searchTerms.filter((term) => {
                        const year = parseInt(term, 10);
                        return !isNaN(year) && year > 1900 && year < 2100;
                      });
                      const nonYearTerms = searchTerms.filter((term) => {
                        const year = parseInt(term, 10);
                        return isNaN(year) || year <= 1900 || year >= 2100;
                      });

                      const conditions = [];

                      // Add year conditions (if any)
                      if (yearTerms.length > 0) {
                        conditions.push({
                          OR: yearTerms.map((term) => ({
                            year: { equals: parseInt(term, 10) },
                          })),
                        });
                      }

                      // Add make/model conditions for non-year terms
                      if (nonYearTerms.length > 0) {
                        // Try to match all non-year terms in make/model
                        conditions.push({
                          AND: nonYearTerms.map((term) => ({
                            OR: [
                              ...vehicleSearchField.map((field) => ({
                                [field]: {
                                  contains: term,
                                  mode: "insensitive",
                                },
                              })),
                              // capitalize first letter
                              ...vehicleSearchField.map((field) => ({
                                [field]: {
                                  contains: term
                                    .split(" ")
                                    .map(
                                      (text) =>
                                        text.charAt(0).toUpperCase() +
                                        text.slice(1)
                                    )
                                    .join(" "),
                                  mode: "insensitive",
                                },
                              })),
                              ...vehicleSearchField.map((field) => ({
                                [field]: {
                                  contains: term.toUpperCase(),
                                  mode: "insensitive",
                                },
                              })),
                            ],
                          })),
                        });
                      }

                      // If we have both year and non-year terms, combine with AND
                      if (conditions.length > 1) {
                        return [{ AND: conditions }];
                      } else if (conditions.length === 1) {
                        return [conditions[0]];
                      }

                      return [];
                    })()
                  : []),
              ],
            },
          },
          // Search by status
          {
            column: {
              title: {
                contains: decodedSearchTerm,
              },
            },
          },
        ];
      })()
    : undefined;

  const totalEstimateCountPromise = db.invoice.count({
    where: {
      type,
      companyId,
      createdAt: {
        gte: startDate ? new Date(`${startDate}T00:00:00`) : undefined,
        lte: endDate ? new Date(`${endDate}T23:59:59.999`) : undefined,
      },
      columnId: {
        in: statusIds,
      },
      OR: searchConditionOR,
    },
  });

  const deliveredStatus = await db.column.findFirst({
    where: {
      companyId: companyId,
      title: "Delivered",
      type: "shop",
    },
  });

  let dateFilter;

  if (
    deliveredStatus?.id &&
    Array.isArray(statusIds) &&
    statusIds.length === 1 &&
    statusIds.includes(deliveredStatus.id)
  ) {
    dateFilter = {
      deliveredAt: {
        ...(convertedStart ? { gte: convertedStart.toDate() } : {}),
        ...(convertedEnd ? { lte: convertedEnd.toDate() } : {}),
      },
    };
  } else if (
    deliveredStatus?.id &&
    Array.isArray(statusIds) &&
    statusIds.length > 1 &&
    statusIds.includes(deliveredStatus.id)
  ) {
    const dateRangeFilter = {
      ...(convertedStart ? { gte: convertedStart.toDate() } : {}),
      ...(convertedEnd ? { lte: convertedEnd.toDate() } : {}),
    };

    dateFilter = {
      OR: [{ createdAt: dateRangeFilter }, { deliveredAt: dateRangeFilter }],
    };
  } else {
    dateFilter = {
      createdAt: {
        ...(convertedStart ? { gte: convertedStart.toDate() } : {}),
        ...(convertedEnd ? { lte: convertedEnd.toDate() } : {}),
      },
    };
  }

  const dataPromise = db.invoice.findMany({
    where: {
      type,
      companyId,
      ...dateFilter,

      columnId: {
        in: statusIds,
      },

      OR: searchConditionOR,
    },

    include: {
      vehicle: {
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          other: true,
        },
      },
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mobile: true,
        },
      },
      column: {
        select: {
          id: true,
          title: true,
          textColor: true,
          bgColor: true,
        },
      },
    },
    skip: (page - 1) * take,
    take: take,
    orderBy: [
      { createdAt: "desc" }, // Initial sort by creation date
    ],
  });

  const [data, totalEstimateCount] = await Promise.all([
    dataPromise,
    totalEstimateCountPromise,
  ]);

  const filteredPromises =
    deliveredStatus?.id &&
    Array.isArray(statusIds) &&
    statusIds.length > 1 &&
    statusIds.includes(deliveredStatus.id)
      ? data.filter((invoice) => {
          const start = convertedStart ? convertedStart.toDate() : null;
          const end = convertedEnd ? convertedEnd.toDate() : null;

          // Helper function to check if date is in range
          const isInRange = (date: any) => {
            if (!date) return false;
            const time = new Date(date).getTime();
            if (start && time < start.getTime()) return false;
            if (end && time > end.getTime()) return false;
            return true;
          };

          return isInRange(invoice.createdAt) || isInRange(invoice.deliveredAt);
        })
      : data;

  // Define custom sorting order for status titles
  const statusOrder = [
    "Pending",
    "In Progress",
    "Completed",
    "Ongoing",
    "Opportunity",
    "Converted",
    "Cancelled",
    "Re-Dos",
    "Follow Up",
    "Lead Lost",
    "Delivered",
  ];

  // Function to get priority index for sorting
  const getStatusPriority = (statusTitle: string): number => {
    const normalizedTitle = statusTitle.toLowerCase().trim();

    // Find exact match first
    const exactIndex = statusOrder.findIndex(
      (status) => status.toLowerCase() === normalizedTitle
    );
    if (exactIndex !== -1) return exactIndex;

    // Find partial match
    const partialIndex = statusOrder.findIndex(
      (status) =>
        normalizedTitle.includes(status.toLowerCase()) ||
        status.toLowerCase().includes(normalizedTitle)
    );
    if (partialIndex !== -1) return partialIndex;

    // Unknown statuses go to the end
    return statusOrder.length;
  };

  const transformedData = filteredPromises.map((item) => {
    const vehicle = item.vehicle;
    const client = item.client;
    const status = item.column;
    const clientName =
      `${client?.firstName ?? ""} ${client?.lastName ?? ""}`.trim();
    return {
      id: item.id,
      clientName: clientName || "",
      vehicle: vehicle
        ? `${vehicle.year ? vehicle.year?.toString().padStart(2, "0") : ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""} ${vehicle.other ?? ""}`
        : "",
      email: client?.email || "",
      phone: client?.mobile || "",
      clientId: item.clientId,
      grandTotal: Number(item.grandTotal || 0),
      createdAt: item.createdAt,
      status: status?.title || "",
      textColor: status?.textColor || "",
      bgColor: status?.bgColor || "",
      statusPriority: getStatusPriority(status?.title || ""),
      deliveredAt: item.deliveredAt,
    };
  });

  // Sort by status priority first, then by createdAt descending
  const sortedData = transformedData.sort((a, b) => {
    // First sort by status priority (ascending - lower index = higher priority)
    if (a.statusPriority !== b.statusPriority) {
      return a.statusPriority - b.statusPriority;
    }
    // Then sort by creation date (descending - newer first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return {
    totalEstimate: totalEstimateCount,
    data: sortedData.map(({ statusPriority, ...item }) => item), // Remove statusPriority from final result
  };
}
