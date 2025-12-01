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
import { Tag } from "@prisma/client";
import { CreateTab } from "../../create/tabs/CreateTab";
import TemplateAttachmentTab from "../TemplateAttachmentTab";
import TemplateInspectionTab from "../TemplateInspectionTab";
import Create from "../../create/Create";
import { TemplateBillSummary } from "../TemplateBillSummary";
import SyncEstimate from "../../create/SyncEstimate";
import Header from "../../create/Header";

export default async function Page({
  searchParams,
}: {
  searchParams: { templateId?: string; isEdit?: boolean };
}) {
  const isEdit = searchParams?.isEdit;
  // console.log("isEdit", isEdit, "templateId", searchParams?.templateId);
  const companyId = await getCompanyId();

  let invoice: any = null;

  if (isEdit && searchParams?.templateId) {
    invoice = await db.invoiceTemplate.findUnique({
      where: { id: searchParams?.templateId, companyId },
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
        <Title>Template</Title>

        <SyncLists
          title=""
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
        <Header />
        {isEdit && (
          <SyncEstimate
            invoice={invoice}
            // @ts-ignore
            items={[]}
            photos={[]}
            tasks={[]}
            inspections={[]}
            payment={null}
          />
        )}

        <Tabs
          defaultValue="create"
          className="col-start-1 flex min-h-[40vh] lg:min-h-[69vh] flex-col overflow-clip"
        >
          <TabsList className="grid grid-cols-4 md:inline-flex">
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

      <div className="app-shadow grid grid-rows-[1fr,auto,auto] divide-y rounded-md">
        <div>
          <Create />
        </div>
        <TemplateBillSummary />
      </div>
    </div>
  );
}
