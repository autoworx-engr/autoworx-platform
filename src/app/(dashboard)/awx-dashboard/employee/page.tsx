import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import Link from "next/link";
import React from "react";
import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css"; // theme css file
import { IoPieChartOutline } from "react-icons/io5";
import TotalPayouts from "../../dashboard/employee/TotalPayouts";
import EmployeeFilter from "../../dashboard/employee/components/EmployeeFilter";
import Employee from "../../dashboard/employee/Employee";

export default async function Page() {
  const companyId = await getCompanyId();
  const employees = await db.user.findMany({
    where: {
      companyId,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      joinDate: true,
      createdAt: true,
      employeeType: true,
      phone: true,
      commission: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      companyName: true,
      image: true,
    },
  });

  return (
    <div className="h-full w-full space-y-8 px-2">
      <Title>Employee List</Title>

      <EmployeeFilter />

      <Employee needCompanyName employees={employees as any} />
    </div>
  );
}
