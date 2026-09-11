import { getSalaryPayouts } from "@/actions/dashboard/data/getSalaryPayouts";
import {
  getMonthlyPayout,
  getPerformance,
} from "@/actions/dashboard/data/getTechnicianInfo";

const round2 = (value: number) => parseFloat(value.toFixed(2));

/**
 * Mirrors the derivation in the web MonthlyPayoutBox: job payout comes from
 * completed work, salary payout only counts when the user has salary configured,
 * and the headline total is the two combined. `timezone` is echoed back so the
 * mobile client can format the pay period in company time.
 */
export async function buildMonthlyPayout(
  timezone: string,
  userId: number,
  companyId: number,
) {
  const [monthlyPayout, salaryPayouts] = await Promise.all([
    getMonthlyPayout(timezone, userId),
    getSalaryPayouts(timezone, userId, companyId),
  ]);

  const hasValidSalaryInfo = !!(
    salaryPayouts &&
    !salaryPayouts.error &&
    salaryPayouts.salaryInfo
  );

  const jobPayout = monthlyPayout?.totalPayout || 0;
  const salaryPayout = hasValidSalaryInfo
    ? salaryPayouts.currentPeriodPayout || 0
    : 0;

  return {
    ...monthlyPayout,
    totalPayout: jobPayout + salaryPayout,
    jobPayout,
    salaryPayout,
    hasValidSalaryInfo,
    timezone,
    salaryPayouts,
  };
}

/**
 * Mirrors the derivation in the web PerformanceBoxForTechnician. A rise in redo
 * jobs is bad performance, so the indicator is flipped for that metric.
 */
export async function buildPerformance(timezone: string, userId: number) {
  const performance = await getPerformance(timezone, userId);

  return {
    totalJobsCount: performance?.totalJobs?.count || 0,
    isTotalJobsPositive: performance?.totalJobs?.growth?.isPositive ?? false,
    totalJobsGrowthRate: round2(performance?.totalJobs?.growth?.rate ?? 0),
    onTimeRate: round2(performance?.onTimeCompletionRate?.rate ?? 0),
    isOnTimePositive:
      performance?.onTimeCompletionRate?.growth?.isPositive ?? false,
    onTimeGrowthRate: round2(
      performance?.onTimeCompletionRate?.growth?.rate ?? 0,
    ),
    redoJobsRate: round2(performance?.redoJobs?.count ?? 0),
    isPerformancePositiveForRedo: !(
      performance?.redoJobs?.growth?.isPositive ?? false
    ),
    redoGrowthRate: round2(performance?.redoJobs?.growth?.rate ?? 0),
  };
}
