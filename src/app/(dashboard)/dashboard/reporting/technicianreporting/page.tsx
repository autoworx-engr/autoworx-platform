import Payout from "@/app/(dashboard)/dashboard/employee/components/Payout";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getUserFromSession } from "@/lib/getCurrentUser";
import { notFound } from "next/navigation";
import React from "react";
import PerformanceReport from "./PerformanceReport";
import TechnicianDetails from "@/app/(dashboard)/dashboard/reporting/technicianreporting/TechnicianDetails";
import TechnicianAttendance from "./TechnicianAttendance";

export default async function TechnicianReportingPage() {
  const currentUser = await getUserFromSession();
  const companyId = await getCompanyId();
  const employee = await db.user.findUnique({
    where: { id: parseInt(currentUser.id), companyId },
  });

  if (!employee) return notFound();

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
    <div className="p-4 sm:p-0">
      <h1 className="my-4 text-2xl font-bold">Technician Reporting</h1>
      <Payout info={technicians} />
      <TechnicianDetails info={technicians} employee={employee} />
      <TechnicianAttendance currentUserId={currentUser?.id} />
      <PerformanceReport />
    </div>
  );
}
