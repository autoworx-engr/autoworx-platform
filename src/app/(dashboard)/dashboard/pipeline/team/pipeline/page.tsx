import { getWorkOrders } from "@/actions/pipelines/getWorkOrders";
import {
  getColumnsByType,
  getTechniciansColumnByCompany,
} from "@/actions/pipelines/pipelinesColumn";
import { authOptions } from "@/authOptions";
import { ShopLead, ShopPipelineData } from "@/types/invoiceLead";
import { Service, Technician } from "@prisma/client";
import { getServerSession } from "next-auth";
import dynamic from "next/dynamic";

const TeamPipelines = dynamic(() => import("../components/TeamPipeline"));

const PipelinePage = async () => {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user;
  const invoices = await getWorkOrders();
  const columnType = "shop";
  console.log("team pipeline");
  const pipelineColumns = await getColumnsByType(columnType);
  const techniciansColumn = await getTechniciansColumnByCompany();
  console.log("techniciansColumn", techniciansColumn);

  const type = "Team Pipelines";

  const servicesOfCurrentUser: any = [];
  let pipelineData: ShopPipelineData[] = [];

  if (invoices && pipelineColumns) {
    const filteredInvoices = invoices.filter((invoice) => {
      return invoice.type === "Invoice";
    });
    const transformedLeads: ShopLead[] = filteredInvoices.map((invoice) => {
      const completedServices: string[] = [];
      const incompleteServices: string[] = [];
      const allTechnicians: Technician[] = [];
      const unAssignedServices: string[] = [];
      invoice.invoiceItems.forEach((item) => {
        const technicians =
          item.service?.Technician?.filter(
            (tech) => tech.invoiceId === invoice.id,
          ) || [];

        if (Array.isArray(technicians) && technicians.length > 0) {
          const statuses = technicians.map((tech) =>
            tech.status?.toLowerCase().trim(),
          );

          servicesOfCurrentUser.push(
            ...technicians.filter(
              (tech) => tech.userId === Number(currentUser?.id),
            ),
          );

          const isServiceComplete = statuses.every(
            (status) => status === "complete",
          );

          if (isServiceComplete) {
            item.service?.name && completedServices.push(item.service?.name);
          } else {
            item.service?.name && incompleteServices.push(item.service?.name);
          }
        } else {
          item.service?.name && unAssignedServices.push(item.service?.name);
        }

        allTechnicians.push(...technicians);
      });
      const columnStatusId = invoice.columnId;
      const dueBalance = Number(invoice.due);
      // const technicians=invoice.;

      return {
        invoiceId: invoice.id,
        name: `${invoice.client?.firstName ?? ""} ${invoice.client?.lastName ?? ""}`.trim(),
        email: invoice.client?.email ?? "",
        phone: invoice.client?.mobile ?? "",
        clientId: invoice.clientId,
        deliveredAt: invoice.deliveredAt,
        vehicle:
          `${invoice.vehicle?.year || ""} ${invoice.vehicle?.make ?? ""} ${invoice.vehicle?.model ?? ""} ${invoice.vehicle?.other ?? ""}`.trim(),
        vehicleId: invoice.vehicleId,
        services: {
          completed: completedServices,
          incomplete: incompleteServices,
          unAssigned: unAssignedServices,
        },
        tags: invoice.tags.map((tag) => ({ id: tag.id, tag: tag.tag })),
        tasks: invoice.tasks,
        assignedTo: invoice.assignedTo,
        createdAt: new Date(invoice.createdAt).toDateString(),
        columnId: columnStatusId,
        dueBalance: dueBalance,
        technicians: allTechnicians,
      };
    });

    let updatedPipelineData = pipelineColumns.map((column) => ({
      id: column.id,
      title: column.title,
      leads: transformedLeads
        .filter((lead) => lead.columnId === column.id)
        .sort((a, b) => {
          const dateA = a.deliveredAt
            ? new Date(a.deliveredAt).getTime()
            : new Date(a.createdAt).getTime();
          const dateB = b.deliveredAt
            ? new Date(b.deliveredAt).getTime()
            : new Date(a.createdAt).getTime();
          // console.log(dateA, dateB);

          return dateB - dateA;
        }),
    }));

    // Only filter for technicians
    if (currentUser?.employeeType === "Technician") {
      updatedPipelineData = updatedPipelineData.map((column) => ({
        ...column,
        leads: column.leads.filter((lead) =>
          servicesOfCurrentUser.some(
            (service: any) => lead.invoiceId === service.invoiceId,
          ),
        ),
      }));
    }
    pipelineData = updatedPipelineData;

    // setPipelineData(updatedPipelineData);
  }
  console.log("pipelineData", pipelineData);
  return (
    <TeamPipelines
      pipelinesTitle={type}
      columns={techniciansColumn}
      shopPipelineDataProp={pipelineData}
      isTechnician={currentUser?.employeeType === "Technician"}
    />
  );
};

export default PipelinePage;
