import Payout from "@/app/(dashboard)/dashboard/employee/components/Payout";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getUserFromSession } from "@/lib/getCurrentUser";
import { getCompanyTimezone } from "@/actions/settings/getCompanyTimezone";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import React from "react";
import PerformanceReport from "./PerformanceReport";
import TechnicianDetails from "@/app/(dashboard)/dashboard/reporting/technicianreporting/TechnicianDetails";
import TechnicianAttendance from "./TechnicianAttendance";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Technician Reporting",
  description: "View and analyze technician performance and reports.",
};

export default async function TechnicianReportingPage() {
  const currentUser = await getUserFromSession();
  const companyId = await getCompanyId();
  const employee = await db.user.findUnique({
    where: { id: parseInt(currentUser.id), companyId },
  });

  if (!employee) return notFound();

  const { timezone } = await getCompanyTimezone();

  // TODO: don't fetch "technicians" if the employee is not a technician
  const technicians = await db.technician.findMany({
    where: { userId: employee.id },
    include: {
      invoice: {
        include: {
          client: true,
          vehicle: true,
          invoiceItems: {
            include: {
              service: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    <div className="p-4 sm:p-6">
      <h1 className="my-4 text-2xl font-bold">Technician Reporting</h1>

      <Payout
        info={technicians}
        employeeId={employee.id}
        employeeType={employee.employeeType}
        timezone={timezone}
      />

      <TechnicianDetails info={technicians} employee={employee} />

      <TechnicianAttendance currentUserId={currentUser?.id} />
      <PerformanceReport />
    </div>
  );
}
