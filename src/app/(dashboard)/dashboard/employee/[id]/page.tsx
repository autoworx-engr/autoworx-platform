import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import EmployeeInformation from "../components/EmployeeInformation";
import EmployeeWorkInformation from "../components/EmployeeWorkInformation";
import Header from "../components/Header";
import { getCompanyId } from "@/lib/companyId";
import BackButton from "@/components/BackButton";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const companyId = await getCompanyId();
  const employee = await db.user.findUnique({
    where: { id: parseInt(params.id), companyId },
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
    orderBy: {
      dateClosed: "desc",
    },
  });

  const salesInfo = await db.lead.findMany({
    where: {
      assignedSalesUserId: employee.id,
      column: {
        title: "Converted",
      },
    },
    include: {
      Client: {
        include: {
          Invoice: {
            include: {
              vehicle: true,
              column: true,
            },
          },
        },
      },
      column: true,
    },
  });
  for (const lead of salesInfo) {
    if (lead.Client.length === 0 && lead.clientId) {
      let fallbackClient = await db.client.findFirst({
        where: {
          companyId,
          id: lead.clientId,
        },
        include: {
          Invoice: {
            include: {
              vehicle: true,
              column: true,
            },
          },
        },
      });
      fallbackClient && lead.Client.push(fallbackClient);
    }
  }
  return (
    <div className="p-2">
      <div className="w-fit">
        <BackButton href="/dashboard/employee" />
      </div>
      <Header />
      <EmployeeInformation employee={employee} info={technicians} />
      <EmployeeWorkInformation
        info={technicians}
        salesInfo={salesInfo}
        employee={employee}
      />
    </div>
  );
}
