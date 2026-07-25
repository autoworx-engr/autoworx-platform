import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTriggerCreate,
} from "@/app/(dashboard)/dashboard/estimate/TabsNav";
import EstimateLogo from "@/components/EstimateLogo";
import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { InvoiceType, Tag } from "@prisma/client";
import { BillSummary } from "./BillSummary";
import ConvertButton from "./ConvertButton";
import Create from "./Create";
import Header from "./Header";
import { AttachmentTab } from "./tabs/AttachmentTab";
import { CreateTab } from "./tabs/CreateTab";
import PaymentTab from "./tabs/PaymentTab";
import EstimateInspectionsTab from "./tabs/EstimateInspectionsTab";
import DynamicTemplateLoader from "../DynamicTemplateLoader";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoices - Create Estimates",
  description: "Create new estimate",
};

export default async function Page(props: {
  searchParams: Promise<{ clientId?: string; templateId?: string }>;
}) {
  const searchParams = await props.searchParams;
  const companyId = await getCompanyId();
  const clientId = searchParams.clientId
    ? parseInt(searchParams.clientId)
    : null;
  const templateId = searchParams.templateId ? searchParams.templateId : null;

  const template = templateId
    ? await db.invoiceTemplate.findUnique({ where: { id: templateId } })
    : null;

  const client = clientId
    ? await db.client.findUnique({
        where: { id: clientId },
      })
    : null;

  const customers = await db.client.findMany({ where: { companyId } });
  const vehicles = await db.vehicle.findMany({
    where: { companyId, clientId },
  });
  const categories = await db.category.findMany({ where: { companyId } });
  const services = await db.service.findMany({
    where: { companyId, canned: true },
  });

  const tags = await db.tag.findMany({ where: { companyId, type: "GENERAL" } });
  const vendors = await db.vendor.findMany({ where: { companyId } });
  const statuses = await db.column.findMany({ where: { companyId } });
  const paymentMethods = await db.paymentMethod.findMany({
    where: { companyId },
  });

  const products = await db.inventoryProduct.findMany({
    where: { companyId, type: "Product" },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  // spread all `tag` objects into `tags` array
  products.forEach((product) => {
    (product as unknown as { tags: Tag[] }).tags = product.tags.map(
      (tag) => tag.tag,
    );
  });

  const labors = await db.labor.findMany({
    where: { companyId, cannedLabor: true },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  // spread all `tag` objects into `tags` array
  labors.forEach((labor) => {
    (labor as unknown as { tags: Tag[] }).tags = labor.tags.map(
      (tag) => tag.tag,
    );
  });

  let materials = [] as any[];

  materials.push(
    ...products.map((product) => ({
      ...product,
      cost: product.price,
      tags: product.tags,
      productId: product.id,
    })),
  );

  return (
    <div className="gap-3 space-y-4 overflow-clip py-2 md:-my-2 md:min-h-[93vh] xl:h-full xl:min-h-0 xl:flex xl:space-y-0">
      <div className="w-full xl:min-w-[68%] flex flex-col gap-4 xl:min-h-0">
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

        {templateId && <DynamicTemplateLoader templateId={templateId} />}

        <Header selectedTemplate={template} />

        <Tabs
          defaultValue="create"
          className="col-start-1 flex min-h-[40vh] lg:min-h-[69vh] xl:min-h-0 flex-col overflow-clip flex-1"
        >
          <TabsList className="grid grid-cols-4 md:inline-flex -ml-4 rounded-bl-none p-0">
            <TabsTriggerCreate value="payments" className="order-4 md:order-1">
              Payments
            </TabsTriggerCreate>
            <TabsTriggerCreate
              value="inspections"
              className="order-3 md:order-2"
            >
              Inspections
            </TabsTriggerCreate>
            <TabsTriggerCreate
              value="attachment"
              className="order-2 md:order-3"
            >
              Attachment
            </TabsTriggerCreate>
            <TabsTriggerCreate value="create" className="order-1 md:order-4">
              Create
            </TabsTriggerCreate>
          </TabsList>

          <TabsContent
            value="create"
            className="flex-1 rounded-tl-none w-full overflow-y-auto thin-scrollbar p-2"
          >
            <CreateTab />
          </TabsContent>

          <TabsContent
            value="attachment"
            className="flex-1 rounded-tl-none w-full overflow-y-auto thin-scrollbar p-2"
          >
            <AttachmentTab />
          </TabsContent>

          <TabsContent
            value="inspections"
            className="flex-1 rounded-tl-none w-full overflow-y-auto thin-scrollbar p-2"
          >
            <EstimateInspectionsTab />
          </TabsContent>
          <TabsContent
            value="payments"
            className="flex-1 rounded-tl-none w-full overflow-y-auto thin-scrollbar p-2"
          >
            <PaymentTab
              clientId={
                searchParams.clientId
                  ? parseInt(searchParams.clientId)
                  : undefined
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex-grow w-full xl:max-w-[32%] app-shadow grid grid-rows-[1fr,auto,auto] divide-y rounded-md bg-slate-50 xl:max-h-[calc(100vh-5rem)] overflow-y-auto thin-scrollbar">
        <div>
          <ConvertButton
            type={InvoiceType.Estimate}
            text="Save as Estimate"
            className="border-none bg-[#6470FF] text-white"
            icon={<EstimateLogo />}
          />
          <Create />
        </div>
        <BillSummary
          isEstimateServiceFee={
            template ? Number(template?.serviceFee) > 0 : true
          }
          isEstimateTax={template ? Number(template?.tax) > 0 : true}
          storedTax={template ? Number(template.tax) : undefined}
          storedServiceFee={template ? Number(template.serviceFee) : undefined}
        />
      </div>
    </div>
  );
}
