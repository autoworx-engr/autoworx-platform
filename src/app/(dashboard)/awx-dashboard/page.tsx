import { db } from "@/lib/db";
import { Client, Company, User } from "@prisma/client";
import React from "react";
import AWXDashboard from "./statistics/AWXDashboard";

export type ICompany = Company & { users: User[]; clients: Client[] };

export type CompanyStat = ICompany & {
  stats: {
    users: number;
    clients: number;
    employees: number;
    technicians: number;
    managers: number;
    others: number;
    sales: number;
  };
  adminEmail?: string | null;
};
const page = async () => {
  let companies = await db.company.findMany({
    include: {
      users: true,
      clients: true,
    },
  });

  let companiesData: CompanyStat[] | [] = [];

  let ind = 0;

  for (const company of companies) {
    let adminUser = company.users.find((user) => user.role === "admin");

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
        default:
          break;
      }
    }

    companiesData[ind] = {
      ...company,
      stats: {
        users,
        clients,
        employees: sales + managers + technicians + others,
        technicians,
        managers,
        others,
        sales,
      },
      adminEmail: adminUser?.email,
    };

    ind++;
  }

  return <AWXDashboard companies={companiesData} />;
};

export default page;
