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
import {
  InventoryProduct,
  InvoiceItem,
  InvoiceType,
  Labor,
  Material,
  Service,
  Tag,
} from "@prisma/client";
import { BillSummary } from "./BillSummary";
import ConvertButton from "./ConvertButton";
import Create from "./Create";
import Header from "./Header";
import { AttachmentTab } from "./tabs/AttachmentTab";
import { CreateTab } from "./tabs/CreateTab";
import PaymentTab from "./tabs/PaymentTab";
import EstimateInspectionsTab from "./tabs/EstimateInspectionsTab";
import SyncEstimate from "./SyncEstimate";

export default async function Page({
  searchParams,
}: {
  searchParams: { clientId?: string; templateId?: string };
}) {
  const companyId = await getCompanyId();
  const clientId = searchParams.clientId
    ? parseInt(searchParams.clientId)
    : null;
  const templateId = searchParams.templateId ? searchParams.templateId : null;

  let estimateTemplate: any = null;
  let photos: any = null;
  let items: any = null;
  let tasks: any = null;
  let invoiceInspections: any = null;

  if (templateId && searchParams?.templateId) {
    estimateTemplate = await db.invoiceTemplate.findUnique({
      where: { id: searchParams?.templateId, companyId },
    });

    items = await db.invoiceItem.findMany({
      where: { invoiceTemplateId: estimateTemplate.id },
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

    items.forEach((item: any) => {
      // @ts-ignore
      item.tags = item.tags?.map((tag) => tag.tag);
      item.materials = item.materials?.map((material: any) => {
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
          (tech: any) => tech.invoiceId === estimateTemplate.id
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
      typeof estimateTemplate?.serviceIndex === "string"
        ? JSON.parse(estimateTemplate.serviceIndex)
        : (estimateTemplate?.serviceIndex ?? []);

    if (Array.isArray(serviceIndex) && serviceIndex.length > 0) {
      items.sort(
        (
          a: InvoiceItem & { service: Service },
          b: InvoiceItem & { service: Service }
        ) => {
          const indexA =
            a.service?.id !== undefined
              ? serviceIndex.indexOf(a.service.id)
              : Infinity;
          const indexB =
            b.service?.id !== undefined
              ? serviceIndex.indexOf(b.service.id)
              : Infinity;

          return indexA - indexB;
        }
      );
    }

    photos = await db.invoicePhoto.findMany({
      where: { invoiceTemplateId: estimateTemplate.id },
    });
    tasks = await db.task.findMany({
      where: { invoiceTemplateId: estimateTemplate.id },
    });

    // Fetch invoice inspections
    invoiceInspections = await db.invoiceInspection.findMany({
      where: { invoiceTemplateId: estimateTemplate.id },
      select: {
        title: true,
        driver: true,
        passenger: true,
        notes: true,
      },
    });
  }

  const template = templateId
    ? await db.invoiceTemplate.findUnique({ where: { id: templateId } })
    : null;

  const client = clientId
    ? await db.client.findUnique({ where: { id: clientId } })
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
      (tag) => tag.tag
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
      (tag) => tag.tag
    );
  });

  let materials = [] as any[];

  materials.push(
    ...products.map((product) => ({
      ...product,
      cost: product.price,
      tags: product.tags,
      productId: product.id,
    }))
  );
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

        {templateId && (
          <SyncEstimate
            template={estimateTemplate}
            // @ts-ignore
            items={items}
            photos={photos}
            tasks={tasks}
            inspections={invoiceInspections}
            payment={null}
          />
        )}

        <Header selectedTemplate={template} />

        <Tabs
          defaultValue="create"
          className="col-start-1 flex min-h-[40vh] lg:min-h-[69vh] flex-col overflow-clip"
        >
          <TabsList className="grid grid-cols-4 md:inline-flex">
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

          <TabsContent value="create" className="h-full w-full">
            <CreateTab />
          </TabsContent>

          <TabsContent value="attachment">
            <AttachmentTab />
          </TabsContent>

          <TabsContent value="inspections">
            <EstimateInspectionsTab />
          </TabsContent>
          <TabsContent value="payments">
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

      <div className="app-shadow grid grid-rows-[1fr,auto,auto] divide-y rounded-md">
        <div>
          <ConvertButton
            type={InvoiceType.Estimate}
            text="Save as Estimate"
            className="border-none bg-[#6470FF] text-white"
            icon={<EstimateLogo />}
          />
          <Create />
        </div>
        <BillSummary />
      </div>
    </div>
  );
}
