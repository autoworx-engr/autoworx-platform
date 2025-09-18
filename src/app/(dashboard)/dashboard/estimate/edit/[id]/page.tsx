import InspectionsTab from "@/app/(dashboard)/dashboard/estimate/create/tabs/InspectionsTab";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/(dashboard)/dashboard/estimate/TabsNav";
import { authOptions } from "@/authOptions";
import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { FaSave } from "react-icons/fa";
import { BillSummary } from "../../create/BillSummary";
import ConvertButton from "../../create/ConvertButton";
import Create from "../../create/Create";
import Header from "../../create/Header";
import SyncEstimate from "../../create/SyncEstimate";
import { AttachmentTab } from "../../create/tabs/AttachmentTab";
import { CreateTab } from "../../create/tabs/CreateTab";
import PaymentTab from "../../create/tabs/PaymentTab";

export default async function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { clientId?: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    throw new Error("Session ID is required");
  }
  const { id } = params;
  // const searchParams = useSearchParams();
  const companyId = await getCompanyId();
  const invoice = await db.invoice.findUnique({
    where: { id, companyId },
    include: {
      requestEstimate: true,
    },
  });

  if (!invoice) return notFound();

  if (session.user.companyId === invoice.fromRequestedCompanyId)
    return notFound();

  const vehicle = invoice.vehicleId
    ? await db.vehicle.findUnique({ where: { id: invoice.vehicleId } })
    : null;
  const client = invoice.clientId
    ? await db.client.findUnique({ where: { id: invoice.clientId } })
    : null;
  const status = invoice.columnId
    ? await db.column.findUnique({ where: { id: invoice.columnId } })
    : null;
  const items = await db.invoiceItem.findMany({
    where: { invoiceId: id },
    include: {
      service: {
        include: {
          Technician: true,
        },
      },
      materials: {
        include: {
          tags: {
            include: { tag: true },
          },
        },
      },
      labor: {
        include: {
          tags: {
            include: { tag: true },
          },
        },
      },
      tags: {
        include: { tag: true },
      },
    },
  });

  const completedServices: string[] = [];
  const incompleteServices: string[] = [];

  items.forEach((item) => {
    // @ts-ignore
    item.tags = item.tags?.map((tag) => tag.tag);
    item.materials = item.materials?.map((material) => {
      // @ts-ignore
      material.tags = material.tags?.map((tag) => tag.tag);
      return material;
    });
    // @ts-ignore
    item.labor = item.labor
      ? {
          ...item.labor,
          // @ts-ignore
          tags: item.labor?.tags?.map((tag) => tag.tag),
        }
      : null;

    //
    //
    //
    // find out incomplete and completed services

    const technicians =
      item.service?.Technician?.filter(
        (tech) => tech.invoiceId === invoice.id
      ) || [];

    if (technicians.length) {
      if (Array.isArray(technicians) && technicians.length > 0) {
        const statuses = technicians.map((tech) =>
          tech.status?.toLowerCase().trim()
        );

        const isServiceComplete = statuses.every(
          (status) => status === "complete"
        );

        if (isServiceComplete) {
          completedServices.push(item.service?.name ?? "");
        } else {
          incompleteServices.push(item.service?.name ?? "");
        }
      } else {
        incompleteServices.push(item.service?.name ?? "");
      }
    }
  });

  // we need to sort based on the serial of the service, the invoice was created by the user
  const serviceIndex =
    typeof invoice?.serviceIndex === "string"
      ? JSON.parse(invoice.serviceIndex)
      : (invoice?.serviceIndex ?? []);

  if (Array.isArray(serviceIndex) && serviceIndex.length > 0) {
    items.sort((a, b) => {
      const indexA =
        a.service?.id !== undefined
          ? serviceIndex.indexOf(a.service.id)
          : Infinity;
      const indexB =
        b.service?.id !== undefined
          ? serviceIndex.indexOf(b.service.id)
          : Infinity;

      return indexA - indexB;
    });
  }

  const photos = await db.invoicePhoto.findMany({ where: { invoiceId: id } });
  const tasks = await db.task.findMany({ where: { invoiceId: id } });

  const clientId = searchParams.clientId
    ? parseInt(searchParams.clientId)
    : invoice.clientId;

  const customers = await db.client.findMany({ where: { companyId } });
  const vehicles = await db.vehicle.findMany({
    where: { companyId, clientId },
  });
  const categories = await db.category.findMany({ where: { companyId } });
  const services = await db.service.findMany({
    where: { companyId, canned: true },
  });
  const tags = await db.tag.findMany({ where: { companyId } });
  const vendors = await db.vendor.findMany({ where: { companyId } });
  const statuses = await db.column.findMany({ where: { companyId } });
  const labors = await db.labor.findMany({
    where: { companyId, cannedLabor: true },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });
  const products = await db.inventoryProduct.findMany({
    where: { companyId, type: "Product" },
    include: { tags: { include: { tag: true } } },
  });

  let materials = [] as any[];
  materials.push(
    // @ts-ignore
    ...products.map((product) => ({
      ...product,
      cost: product.price,
      tags: product.tags.map((tag) => tag.tag),
      productId: product.id,
    }))
  );

  labors.forEach((labor) => {
    // @ts-ignore
    labor.discount = Number(labor.discount) || 0;
    // @ts-ignore
    labor.hours = Number(labor.hours) || 0;
    // @ts-ignore
    labor.charge = Number(labor.charge) || 0;
    // @ts-ignore
    labor.tags = labor.tags.map((tag) => tag.tag);
  });

  const payment = await db.payment.findFirst({
    where: { invoiceId: id },
    include: {
      card: true,
      check: true,
      cash: true,
      other: {
        include: {
          paymentMethod: true,
        },
      },
    },
  });

  const paymentMethods = await db.paymentMethod.findMany({
    where: { companyId },
  });
  // Fetch invoice inspections
  const invoiceInspections = await db.invoiceInspection.findMany({
    where: { invoiceId: id },
    select: {
      title: true,
      driver: true,
      passenger: true,
      notes: true,
    },
  });

  return (
    <div className="gap-3 space-y-4 overflow-clip py-2 md:-my-2 md:min-h-[93vh] xl:grid xl:grid-cols-4 xl:space-y-0">
      <div className="col-span-3 space-y-4">
        <Title>Estimate</Title>

        <SyncLists
          customers={customers}
          vehicles={vehicles}
          categories={categories}
          services={services}
          materials={materials}
          labors={labors}
          tags={tags}
          vendors={vendors}
          statuses={statuses}
          paymentMethods={paymentMethods}
          client={client}
        />
        <SyncEstimate
          invoice={invoice}
          // @ts-ignore
          items={items}
          photos={photos}
          tasks={tasks}
          payment={payment}
          inspections={invoiceInspections}
        />

        <Header
          id={invoice.id}
          client={client!}
          vehicle={vehicle!}
          status={status!}
          invoice={invoice}
          isAllServicesCompleted={incompleteServices.length === 0}
          isEdit={true}
        />

        <Tabs
          defaultValue="create"
          className="col-start-1 flex min-h-[40vh] lg:min-h-[69vh] flex-col overflow-clip"
        >
          <TabsList className="grid grid-cols-4 md:inline-flex">
            <TabsTrigger value="payments" className="order-4 pl-12 md:order-1">
              Payments
            </TabsTrigger>
            <TabsTrigger
              value="inspections"
              className="order-3 pl-12 md:order-2"
            >
              Inspections
            </TabsTrigger>
            <TabsTrigger
              value="attachment"
              className="order-2 pl-12 md:order-3"
            >
              Attachment
            </TabsTrigger>
            <TabsTrigger value="create" className="order-1 md:order-4">
              Create
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <CreateTab />
          </TabsContent>

          <TabsContent value="attachment">
            <AttachmentTab />
          </TabsContent>

          <TabsContent value="inspections">
            <InspectionsTab />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentTab
              clientId={
                searchParams.clientId
                  ? parseInt(searchParams.clientId)
                  : (invoice?.clientId ?? undefined)
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      <div className="app-shadow grid grid-rows-[1fr,auto,auto] divide-y rounded-md">
        <div>
          <ConvertButton
            type={invoice.type}
            text={`Update ${invoice.type}`}
            icon={<FaSave />}
            className="border-none bg-[#6571FF] px-8 text-white"
          />
          {/* <ConvertTo invoice={invoice} /> */}

          <Create />
        </div>
        <BillSummary
          isEstimateServiceFee={Number(invoice.serviceFee) > 0}
          isEstimateTax={Number(invoice.tax) > 0}
        />
      </div>
    </div>
  );
}
