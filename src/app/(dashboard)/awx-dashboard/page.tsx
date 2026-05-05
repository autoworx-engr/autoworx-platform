import { db } from "@/lib/db";
import React from "react";
import AWXDashboard from "./statistics/AWXDashboard";

export type CompanyStat = {
  id: number;
  name: string;
  image: string | null;
  email: string | null;
  createdAt: Date;
  enforcePlatformPlan: boolean;
  adminEmail: string | null;
  subscriptionStatus: string | null;
  subscriptionPlanName: string | null;
  stats: {
    users: number;
    clients: number;
    employees: number;
    technicians: number;
    managers: number;
    others: number;
    sales: number;
  };
};

export type PlatformStats = {
  totalActiveContracts: number;
  monthlyRevenue: number;
  churnRate: number;
  growthRate: number;
};

const page = async () => {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    companies,
    subscriptions,
    newSubsThisMonth,
    newSubsLastMonth,
    cancelledCount,
    totalSubCount,
  ] = await Promise.all([
    db.company.findMany({
      select: {
        id: true,
        name: true,
        image: true,
        email: true,
        createdAt: true,
        enforcePlatformPlan: true,
        users: {
          select: { role: true, employeeType: true, email: true },
        },
        clients: { select: { id: true } },
        platformSubscription: {
          select: {
            status: true,
            plan: { select: { name: true, price: true } },
          },
        },
      },
    }),
    db.platformSubscription.findMany({
      where: { status: "ACTIVE" },
      select: { plan: { select: { price: true } } },
    }),
    db.platformSubscription.count({
      where: { createdAt: { gte: startOfThisMonth } },
    }),
    db.platformSubscription.count({
      where: {
        createdAt: { gte: startOfLastMonth, lt: startOfThisMonth },
      },
    }),
    db.platformSubscription.count({
      where: { status: "CANCELED" },
    }),
    db.platformSubscription.count(),
  ]);

  const monthlyRevenue = subscriptions.reduce(
    (sum, s) => sum + Number(s.plan?.price ?? 0),
    0,
  );
  const churnRate =
    totalSubCount > 0 ? Math.round((cancelledCount / totalSubCount) * 100) : 0;
  const growthRate =
    newSubsLastMonth > 0
      ? Math.round(
          ((newSubsThisMonth - newSubsLastMonth) / newSubsLastMonth) * 100,
        )
      : newSubsThisMonth > 0
        ? 100
        : 0;

  const platformStats: PlatformStats = {
    totalActiveContracts: subscriptions.length,
    monthlyRevenue,
    churnRate,
    growthRate,
  };

  const companiesData: CompanyStat[] = companies.map((company) => {
    const adminUser = company.users.find((u) => u.role === "admin");

    let users = company.users.length,
      clients = company.clients.length,
      employees = 0,
      technicians = 0,
      managers = 0,
      others = 0,
      sales = 0;

    for (const user of company.users) {
      switch (user.employeeType) {
        case "Sales":
          sales++;
          break;
        case "Manager":
          managers++;
          break;
        case "Technician":
          technicians++;
          break;
        case "Other":
          others++;
          break;
      }
    }
    employees = sales + managers + technicians + others;

    return {
      id: company.id,
      name: company.name,
      image: company.image,
      email: company.email,
      createdAt: company.createdAt,
      enforcePlatformPlan: company.enforcePlatformPlan,
      adminEmail: adminUser?.email ?? null,
      subscriptionStatus: company.platformSubscription?.status ?? null,
      subscriptionPlanName: company.platformSubscription?.plan?.name ?? null,
      stats: {
        users,
        clients,
        employees,
        technicians,
        managers,
        others,
        sales,
      },
    };
  });

  return (
    <AWXDashboard companies={companiesData} platformStats={platformStats} />
  );
};

export default page;
