'use server';

import { getCompanyId } from '@/lib/companyId';
import { db } from '@/lib/db';

import {
  differenceInHours,
  eachMonthOfInterval,
  endOfMonth,
  startOfMonth,
} from 'date-fns';
import moment from 'moment';
import { difference, getDateRanges, growthRate } from './lib';

export async function getLeadInfo(
  timezone: string,
  startDate?: string,
  endDate?: string
) {
  // Convert string dates to Date objects if provided
  let startDateObj: Date | undefined;
  let endDateObj: Date | undefined;
  const { currentMonthStart, currentMonthEnd } = getDateRanges(timezone);

  if (startDate && endDate) {
    // Use moment to handle date formatting consistently
    startDateObj = moment(startDate, 'MM/DD/YYYY').startOf('day').toDate();
    endDateObj = moment(endDate, 'MM/DD/YYYY').endOf('day').toDate();
  }
  //  else {
  //   // Default to current month if no dates are provided
  //   startDateObj = currentMonthStart;
  //   endDateObj = currentMonthEnd;
  // }

  const monthlyQualifiedAndUnqualifiedLeads =
    await getMonthlyQualifiedAndUnqualifiedLeads(
      startDateObj,
      endDateObj,
      timezone
    );

  const convertedLeadsPerMonth = await getConvertedLeadsPerMonth(
    startDateObj,
    endDateObj
  );
  const leadsBySource = await getLeadsBySource(
    timezone,
    startDateObj,
    endDateObj
  );
  const averageConversionTime = await getAverageConversionTime(
    startDateObj,
    endDateObj
  );
  const leadToOpportunityRatio = await getLeadToOpportunityRatio(
    timezone,
    startDateObj,
    endDateObj
  );
  const avgResponseTime = await getAverageTimeToContact(
    startDateObj,
    endDateObj
  );

  let lostLeads;
  if (startDateObj && endDateObj) {
    lostLeads = await getLeadsLost(startDateObj, endDateObj);
  } else {
    lostLeads = await getLeadsLost(currentMonthStart, currentMonthEnd);
  }

  const averageDealSize = await getAverageDealSize(
    timezone,
    startDateObj,
    endDateObj
  );

  // For growth rate calculation, handle same-day ranges with moment
  const growthRateData =
    startDate && endDate
      ? await getCustomRangeGrowthRates(startDateObj!, endDateObj!, timezone)
      : await getGrowthRates(timezone);

  return {
    monthlyQualifiedAndUnqualifiedLeads,
    convertedLeadsPerMonth,
    leadsBySource,
    averageConversionTime,
    leadToOpportunityRatio,
    avgResponseTime,
    lostLeads,
    growthRate: growthRateData,
    averageDealSize,
  };
}

export async function getAverageDealSize(
  timezone: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  const companyId = await getCompanyId();
  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
  } = getDateRanges(timezone);
  // Get all the leads for this month and this company
  const leads = await db.lead.findMany({
    where: {
      companyId,
      column: {
        title: 'Converted',
      },
      createdAt: {
        gte: startDate ?? currentMonthStart,
        lte: endDate ?? currentMonthEnd,
      },
    },
    include: {
      Client: {
        include: {
          Invoice: {
            where: {
              type: 'Invoice',
            },
          },
        },
      },
    },
  });

  for (const lead of leads) {
    if (lead.Client.length === 0 && lead.clientId) {
      let fallbackClient = await db.client.findFirst({
        where: {
          companyId,
          id: lead.clientId,
        },
        include: {
          Invoice: {
            where: {
              type: 'Invoice',
            },
          },
        },
      });
      fallbackClient && lead.Client.push(fallbackClient);
    }
  }

  // Extract the invoices
  const invoiceGrandTotals = leads.flatMap(lead =>
    lead.Client.flatMap(client =>
      client.Invoice.map(invoice => invoice.grandTotal)
    )
  );
  const invoiceLength = invoiceGrandTotals.length;
  // Filter out null values and sum the totals
  const total = invoiceGrandTotals
    .filter(grandTotal => grandTotal !== null)
    .reduce((acc, curr) => acc + (curr ? Number(curr) : 0), 0);

  // Calculate and return only the average
  return invoiceLength === 0 ? 0 : total / invoiceLength;
}

export const getMonthlyQualifiedAndUnqualifiedLeads = async (
  startDate?: Date,
  endDate?: Date,
  timezone: string = 'America/Detroit'
): Promise<{ month: string; qualified: number; unqualified: number }[]> => {
  const companyId = await getCompanyId();

  // Default to start and end of current year in given timezone
  const start = moment(startDate ?? moment().startOf('year'));
  const end = moment(endDate ?? moment().endOf('year'));

  const months: moment.Moment[] = [];
  let current = start.clone().startOf('month');

  while (current.isSameOrBefore(end, 'month')) {
    months.push(current.clone());
    current.add(1, 'month');
  }

  const leadsData = await Promise.all(
    months.map(async month => {
      const monthStart = moment.tz(
        { year: month.year(), month: month.month(), day: 1 },
        timezone
      );

      const effectiveStartDate = monthStart
        .clone()
        .startOf('month')
        .startOf('day')
        .toDate();
      const effectiveEndDate = monthStart
        .clone()
        .add(1, 'month')
        .startOf('month')
        .subtract(1, 'second')
        .toDate();

      const qualifiedLeads = await db.lead.count({
        where: {
          companyId,
          isQualified: true,
          createdAt: {
            gte: effectiveStartDate,
            lte: effectiveEndDate,
          },
        },
      });

      const unqualifiedLeads = await db.lead.count({
        where: {
          companyId,
          isQualified: false,
          createdAt: {
            gte: effectiveStartDate,
            lte: effectiveEndDate,
          },
        },
      });

      return {
        month: month.format('MMM'),
        qualified: qualifiedLeads,
        unqualified: unqualifiedLeads,
      };
    })
  );

  return leadsData;
};

export const getConvertedLeadsPerMonth = async (
  startDate?: Date,
  endDate?: Date
): Promise<{ month: string; converted: number }[]> => {
  const companyId = await getCompanyId();
  const months = eachMonthOfInterval({
    start: startDate ?? new Date(new Date().getFullYear(), 0, 1),
    end: endDate ?? new Date(new Date().getFullYear(), 11, 31),
  });

  const convertedLeadsData = await Promise.all(
    months.map(async month => {
      const startOfMonthDate = startOfMonth(month);
      const endOfMonthDate = endOfMonth(month);

      // Ensure the dates are within the provided range
      const effectiveStartDate = startDate
        ? new Date(Math.max(startOfMonthDate.getTime(), startDate.getTime()))
        : startOfMonthDate;
      const effectiveEndDate = endDate
        ? new Date(Math.min(endOfMonthDate.getTime(), endDate.getTime()))
        : endOfMonthDate;

      const convertedLeads = await db.lead.count({
        where: {
          companyId,
          column: {
            title: 'Converted',
          },
          columnChangedAt: {
            gte: effectiveStartDate,
            lte: effectiveEndDate,
          },
        },
      });

      return {
        month: month.toLocaleString('default', { month: 'short' }),
        converted: convertedLeads,
      };
    })
  );

  return convertedLeadsData;
};
export async function getLeadsBySource(
  timezone: string,
  startDate?: Date,
  endDate?: Date
) {
  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
  } = getDateRanges(timezone);
  // Default to the current month's start and end dates if no custom range is provided
  const effectiveStartDate = startDate ?? currentMonthStart;
  const effectiveEndDate = endDate ?? currentMonthEnd;

  const leadsBySource = await db.lead.groupBy({
    where: {
      companyId: await getCompanyId(),
      createdAt: {
        gte: effectiveStartDate,
        lte: effectiveEndDate,
      },
    },
    by: ['source'],
    _count: {
      id: true,
    },
  });

  return leadsBySource.map(lead => ({
    source: lead.source,
    leads: lead._count.id,
  }));
}

// Get average conversion time
export const getAverageConversionTime = async (
  startDate?: Date,
  endDate?: Date
): Promise<number> => {
  const companyId = await getCompanyId();
  const convertedColumn = await db.column.findFirst({
    where: {
      companyId: companyId,
      title: 'Converted',
    },
    select: {
      id: true,
    },
  });

  const leads = await db.lead.findMany({
    where: {
      companyId: companyId,
      columnId: convertedColumn?.id,
      columnChangedAt: {
        not: null,
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      createdAt: true,
      columnChangedAt: true,
    },
  });

  if (leads.length === 0) return 0;

  const totalHours = leads.reduce((sum, lead) => {
    return (
      sum +
      differenceInHours(
        new Date(lead.columnChangedAt ?? new Date()),
        new Date(lead.createdAt)
      )
    );
  }, 0);

  return parseFloat((totalHours / leads.length).toFixed(2));
};

export const getLeadToOpportunityRatio = async (
  timezone: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> => {
  const companyId = await getCompanyId();
  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
  } = getDateRanges(timezone);
  // Default to the current month's start and end dates if no custom range is provided
  const effectiveStartDate = startDate ?? currentMonthStart;
  const effectiveEndDate = endDate ?? currentMonthEnd;
  // Count total leads
  const totalLeads = await db.lead.count({
    where: {
      companyId,
      createdAt: {
        gte: effectiveStartDate,
        lte: effectiveEndDate,
      },
    },
  });
  // Count appointments associated with leads (clients)
  const totalLeadAppointments = await db.appointment.count({
    where: {
      companyId,
      date: {
        gte: effectiveStartDate,
        lte: effectiveEndDate,
      },
      client: {
        leadId: {
          not: null, // Ensure the appointment is linked to a lead
        },
      },
    },
  });

  if (totalLeads === 0) return 0;

  const calculation = (totalLeadAppointments / totalLeads) * 100;
  return parseFloat(calculation.toFixed(2));
};

export const getAverageTimeToContact = async (
  startDate?: Date,
  endDate?: Date
): Promise<number> => {
  const ongoingColumn = await db.column.findFirst({
    where: {
      companyId: await getCompanyId(),
      title: 'Ongoing',
    },
    select: {
      id: true,
    },
  });

  const leads = await db.lead.findMany({
    where: {
      companyId: await getCompanyId(),
      columnId: ongoingColumn?.id,
      columnChangedAt: {
        not: null,
      },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      createdAt: true,
      columnChangedAt: true,
    },
  });

  if (leads.length === 0) return 0;

  const totalHours = leads.reduce((sum, lead) => {
    return (
      sum +
      differenceInHours(
        new Date(lead.columnChangedAt ?? new Date()),
        new Date(lead.createdAt)
      )
    );
  }, 0);

  return totalHours / leads.length;
};

export const getLeadsLost = async (
  startDate?: Date,
  endDate?: Date
): Promise<number> => {
  const lostColumn = await db.column.findFirst({
    where: {
      companyId: await getCompanyId(),
      title: 'Lead Lost',
    },
    select: { id: true },
  });
  const leads = await db.lead.count({
    where: {
      companyId: await getCompanyId(),
      columnId: lostColumn?.id,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
  return leads;
};

//growth rates for the matrix
export const getGrowthRates = async (timezone: string) => {
  const {
    currentMonthStart,
    currentMonthEnd,
    previousMonthStart,
    previousMonthEnd,
  } = getDateRanges(timezone);
  const previousAverageConversionTime = await getAverageConversionTime(
    previousMonthStart,
    previousMonthEnd
  );
  const currentAverageConversionTime = await getAverageConversionTime(
    currentMonthStart,
    currentMonthEnd
  );

  const previousLeadToOpportunityRatio = await getLeadToOpportunityRatio(
    timezone,
    previousMonthStart,
    previousMonthEnd
  );
  const currentLeadToOpportunityRatio = await getLeadToOpportunityRatio(
    timezone,
    currentMonthStart,
    currentMonthEnd
  );

  const previousAvgResponseTime = await getAverageTimeToContact(
    previousMonthStart,
    previousMonthEnd
  );
  const currentAvgResponseTime = await getAverageTimeToContact(
    currentMonthStart,
    currentMonthEnd
  );

  const previousLostLeads = await getLeadsLost(
    previousMonthStart,
    previousMonthEnd
  );
  const currentLostLeads = await getLeadsLost(
    currentMonthStart,
    currentMonthEnd
  );

  const previousAverageDealSize = await getAverageDealSize(
    timezone,
    previousMonthStart,
    previousMonthEnd
  );
  const currentAverageDealSize = await getAverageDealSize(
    timezone,
    currentMonthStart,
    currentMonthEnd
  );

  return {
    averageConversionTimeGR: growthRate(
      currentAverageConversionTime,
      previousAverageConversionTime
    ),
    leadToOpportunityRatioGR: difference(
      currentLeadToOpportunityRatio,
      previousLeadToOpportunityRatio
    ),
    avgResponseTimeGR: growthRate(
      currentAvgResponseTime,
      previousAvgResponseTime
    ),
    lostLeadsGR: growthRate(currentLostLeads, previousLostLeads),
    averageDealSizeGR: growthRate(
      currentAverageDealSize,
      previousAverageDealSize
    ),
  };
};

// Update the custom range growth rates function
async function getCustomRangeGrowthRates(
  startDate: Date,
  endDate: Date,
  timezone: string
) {
  // For same-day selections, use previous day as comparison
  if (moment(startDate).isSame(endDate, 'day')) {
    const previousEndDate = moment(startDate)
      .subtract(1, 'millisecond')
      .toDate();
    const previousStartDate = moment(startDate)
      .subtract(1, 'day')
      .startOf('day')
      .toDate();

    // Get metrics for both periods
    const previousAverageConversionTime = await getAverageConversionTime(
      previousStartDate,
      previousEndDate
    );
    const currentAverageConversionTime = await getAverageConversionTime(
      startDate,
      endDate
    );

    const previousLeadToOpportunityRatio = await getLeadToOpportunityRatio(
      timezone,
      previousStartDate,
      previousEndDate
    );
    const currentLeadToOpportunityRatio = await getLeadToOpportunityRatio(
      timezone,
      startDate,
      endDate
    );

    const previousAvgResponseTime = await getAverageTimeToContact(
      previousStartDate,
      previousEndDate
    );
    const currentAvgResponseTime = await getAverageTimeToContact(
      startDate,
      endDate
    );

    const previousLostLeads = await getLeadsLost(
      previousStartDate,
      previousEndDate
    );
    const currentLostLeads = await getLeadsLost(startDate, endDate);

    const previousAverageDealSize = await getAverageDealSize(
      timezone,
      previousStartDate,
      previousEndDate
    );
    const currentAverageDealSize = await getAverageDealSize(
      timezone,
      startDate,
      endDate
    );

    return {
      averageConversionTimeGR: growthRate(
        currentAverageConversionTime,
        previousAverageConversionTime
      ),
      leadToOpportunityRatioGR: growthRate(
        currentLeadToOpportunityRatio,
        previousLeadToOpportunityRatio
      ),
      avgResponseTimeGR: growthRate(
        currentAvgResponseTime,
        previousAvgResponseTime
      ),
      lostLeadsGR: growthRate(currentLostLeads, previousLostLeads),
      averageDealSizeGR: growthRate(
        currentAverageDealSize,
        previousAverageDealSize
      ),
    };
  } else {
    const duration = moment(endDate).diff(startDate);
    const previousEndDate = moment(startDate)
      .subtract(1, 'millisecond')
      .toDate();
    const previousStartDate = moment(previousEndDate)
      .subtract(duration)
      .toDate();

    // Get metrics for both periods
    const previousAverageConversionTime = await getAverageConversionTime(
      previousStartDate,
      previousEndDate
    );
    const currentAverageConversionTime = await getAverageConversionTime(
      startDate,
      endDate
    );

    const previousLeadToOpportunityRatio = await getLeadToOpportunityRatio(
      timezone,
      previousStartDate,
      previousEndDate
    );
    const currentLeadToOpportunityRatio = await getLeadToOpportunityRatio(
      timezone,
      startDate,
      endDate
    );

    const previousAvgResponseTime = await getAverageTimeToContact(
      previousStartDate,
      previousEndDate
    );
    const currentAvgResponseTime = await getAverageTimeToContact(
      startDate,
      endDate
    );

    const previousLostLeads = await getLeadsLost(
      previousStartDate,
      previousEndDate
    );
    const currentLostLeads = await getLeadsLost(startDate, endDate);

    const previousAverageDealSize = await getAverageDealSize(
      timezone,
      previousStartDate,
      previousEndDate
    );
    const currentAverageDealSize = await getAverageDealSize(
      timezone,
      startDate,
      endDate
    );

    return {
      averageConversionTimeGR: growthRate(
        currentAverageConversionTime,
        previousAverageConversionTime
      ),
      leadToOpportunityRatioGR: growthRate(
        currentLeadToOpportunityRatio,
        previousLeadToOpportunityRatio
      ),
      avgResponseTimeGR: growthRate(
        currentAvgResponseTime,
        previousAvgResponseTime
      ),
      lostLeadsGR: growthRate(currentLostLeads, previousLostLeads),
      averageDealSizeGR: growthRate(
        currentAverageDealSize,
        previousAverageDealSize
      ),
    };
  }
}
