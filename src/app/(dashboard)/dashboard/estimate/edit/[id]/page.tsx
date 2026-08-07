export const dynamic = "force-dynamic";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/(dashboard)/dashboard/estimate/TabsNav";
import { authOptions } from "@/authOptions";
import BackButton from "@/components/BackButton";
import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { Save } from "lucide-react";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { BillSummary } from "../../create/BillSummary";
import ConvertButton from "../../create/ConvertButton";
import Create from "../../create/Create";
import Header from "../../create/Header";
import SyncEstimate from "../../create/SyncEstimate";
import { AttachmentTab } from "../../create/tabs/AttachmentTab";
import { CreateTab } from "../../create/tabs/CreateTab";
import EstimateInspectionsTab from "../../create/tabs/EstimateInspectionsTab";
import PaymentTab from "../../create/tabs/PaymentTab";
import DynamicTemplateLoader from "../../DynamicTemplateLoader";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Estimate",
  description: "Edit and manage your estimate details.",
};

export default async function Page(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ clientId?: string; templateId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const session = await getServerSession(authOptions);
  const templateId = searchParams.templateId ? searchParams.templateId : null;

  if (!session) {
    throw new Error("Session ID is required");
  }
  const { id } = params;
  // const searchParams = useSearchParams();
  const companyId = await getCompanyId();
  const template = templateId
    ? await db.invoiceTemplate.findUnique({ where: { id: templateId } })
    : null;
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
        (tech) => tech.invoiceId === invoice.id,
      ) || [];

    if (technicians.length) {
      if (Array.isArray(technicians) && technicians.length > 0) {
        const statuses = technicians.map((tech) =>
          tech.status?.toLowerCase().trim(),
        );

        const isServiceComplete = statuses.every(
          (status) => status === "complete",
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
    })),
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
  const pageType = invoice?.type === "Invoice" ? "Invoice" : "Estimate";

  return (
    <div className="gap-3 space-y-4 overflow-clip py-2 md:-my-2 md:min-h-[93vh] xl:flex xl:space-y-0 px-1">
      <div className="w-full xl:min-w-[68%] flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <BackButton
            href={
              pageType === "Invoice"
                ? "/dashboard/estimate/invoices"
                : "/dashboard/estimate"
            }
          />
          <Title>{pageType}</Title>
        </div>

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

        {templateId && <DynamicTemplateLoader templateId={templateId} />}

        <Header
          id={invoice.id}
          client={client!}
          vehicle={vehicle!}
          status={status!}
          invoice={invoice}
          isAllServicesCompleted={incompleteServices.length === 0}
          isEdit={true}
          requestEstimate={invoice?.requestEstimate}
        />

        <Tabs
          defaultValue="create"
          className="col-start-1 flex min-h-[40vh] lg:min-h-[69vh] flex-col overflow-clip flex-1"
        >
          <TabsList className="grid grid-cols-4 md:inline-flex -ml-4 rounded-bl-none p-0">
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

          <TabsContent
            value="create"
            className="h-full rounded-tl-none w-full xl:h-full xl:max-h-[calc(100vh-19.5rem)] overflow-y-auto thin-scrollbar p-2"
          >
            <CreateTab />
          </TabsContent>

          <TabsContent
            value="attachment"
            className="h-full rounded-tl-none w-full xl:h-full xl:max-h-[calc(100vh-19.5rem)] overflow-y-auto thin-scrollbar p-2"
          >
            <AttachmentTab />
          </TabsContent>

          <TabsContent
            value="inspections"
            className="h-full rounded-tl-none w-full xl:h-full xl:max-h-[calc(100vh-19.5rem)] overflow-y-auto thin-scrollbar p-2"
          >
            <EstimateInspectionsTab />
          </TabsContent>
          <TabsContent
            value="payments"
            className="h-full rounded-tl-none w-full xl:h-full xl:max-h-[calc(100vh-19.5rem)] overflow-y-auto thin-scrollbar p-2"
          >
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

      <div className="flex-grow w-full xl:max-w-[32%] app-shadow grid grid-rows-[1fr,auto,auto] divide-y rounded-md bg-slate-50 xl:max-h-[calc(100vh-5rem)] overflow-y-auto thin-scrollbar">
        <div>
          <ConvertButton
            type={invoice.type}
            text={`Update ${invoice.type}`}
            // text={`Update ${pageType}`
            icon={<Save size={18} />}
            className="border-none bg-primary px-8 text-white"
          />
          {/* <ConvertTo invoice={invoice} /> */}

          <Create />
        </div>
        <BillSummary
          isEstimateServiceFee={
            template
              ? Number(template?.serviceFee) > 0
              : Number(invoice.serviceFee) > 0
          }
          isEstimateTax={
            template ? Number(template?.tax) > 0 : Number(invoice.tax) > 0
          }
          storedTax={template ? Number(template.tax) : Number(invoice.tax)}
          storedServiceFee={
            template ? Number(template.serviceFee) : Number(invoice.serviceFee)
          }
        />
      </div>
    </div>
  );
}
