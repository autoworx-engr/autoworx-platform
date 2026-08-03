import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTriggerCreate,
} from "@/app/(dashboard)/dashboard/estimate/TabsNav";
import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { InvoiceItem, Service, Tag } from "@prisma/client";
import { CreateTab } from "../../create/tabs/CreateTab";
import TemplateAttachmentTab from "../TemplateAttachmentTab";
import TemplateInspectionTab from "../TemplateInspectionTab";
import Create from "../../create/Create";
import { TemplateBillSummary } from "../TemplateBillSummary";
import SyncEstimate from "../../create/SyncEstimate";
import Header from "../../create/Header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoices - Create Template",
  description: "Create a new template",
};

export default async function Page(props: {
  searchParams: Promise<{ templateId?: string; isEdit?: boolean }>;
}) {
  const searchParams = await props.searchParams;
  const isEdit = searchParams?.isEdit;
  // console.log("isEdit", isEdit, "templateId", searchParams?.templateId);
  const companyId = await getCompanyId();

  let invoice: any = null;
  let photos: any = null;
  let items: any = null;
  let tasks: any = null;
  let invoiceInspections: any = null;

  if (isEdit && searchParams?.templateId) {
    invoice = await db.invoiceTemplate.findUnique({
      where: { id: searchParams?.templateId, companyId },
    });

    items = await db.invoiceItem.findMany({
      where: { invoiceTemplateId: invoice.id },
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
          (tech: any) => tech.invoiceId === invoice.id,
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
      items.sort(
        (
          a: InvoiceItem & { service: Service },
          b: InvoiceItem & { service: Service },
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
        },
      );
    }

    photos = await db.templatePhoto.findMany({
      where: { invoiceTemplateId: invoice.id },
    });
    tasks = await db.task.findMany({
      where: { invoiceTemplateId: invoice.id },
    });

    // Fetch invoice inspections
    invoiceInspections = await db.invoiceInspection.findMany({
      where: { invoiceTemplateId: invoice.id },
      select: {
        title: true,
        driver: true,
        passenger: true,
        notes: true,
      },
    });
  }

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

  const status = invoice?.columnId
    ? await db.column.findUnique({ where: { id: invoice?.columnId } })
    : null;

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
    <div className="gap-3 space-y-4 overflow-clip py-2 md:-my-2 md:min-h-[93vh] xl:flex xl:space-y-0 px-1">
      <div className="w-full xl:min-w-[68%] flex flex-col gap-3">
        <Title>Template</Title>

        <SyncLists
          title={invoice?.title}
          customers={[]}
          vehicles={[]}
          categories={categories}
          services={services}
          materials={materials}
          labors={labors}
          tags={tags}
          vendors={vendors}
          statuses={statuses}
          paymentMethods={paymentMethods}
          client={null}
        />
        <Header status={status!} />
        {isEdit && (
          <SyncEstimate
            template={invoice}
            // @ts-ignore
            items={items}
            photos={photos}
            tasks={tasks}
            inspections={invoiceInspections}
            payment={null}
          />
        )}

        <Tabs
          defaultValue="create"
          className="col-start-1 flex min-h-[40vh] lg:min-h-[69vh] flex-col overflow-clip"
        >
          <TabsList className="grid grid-cols-4 md:inline-flex -ml-4 rounded-bl-none">
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
            <TemplateAttachmentTab />
          </TabsContent>
          <TabsContent value="inspections">
            <TemplateInspectionTab />
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex-grow w-full xl:max-w-[32%] app-shadow grid grid-rows-[1fr,auto,auto] divide-y rounded-md">
        <div>
          <Create />
        </div>
        <TemplateBillSummary
          isEdit={isEdit}
          isEstimateServiceFee={Number(invoice?.serviceFee) > 0}
          isEstimateTax={Number(invoice?.tax) > 0}
          storedTax={isEdit ? Number(invoice?.tax) : undefined}
          storedServiceFee={isEdit ? Number(invoice?.serviceFee) : undefined}
        />
      </div>
    </div>
  );
}
