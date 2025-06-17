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
  InvoiceType,
  Labor,
  Material,
  Tag,
} from "@prisma/client";
import { BillSummary } from "./BillSummary";
import ConvertButton from "./ConvertButton";
import Create from "./Create";
import Header from "./Header";
import { AttachmentTab } from "./tabs/AttachmentTab";
import { CreateTab } from "./tabs/CreateTab";
import InspectionsTab from "./tabs/InspectionsTab";
import PaymentTab from "./tabs/PaymentTab";

export default async function Page({
  searchParams,
}: {
  searchParams: { clientId?: string };
}) {
  const clientId = searchParams.clientId
    ? parseInt(searchParams.clientId)
    : null;
  const client = clientId
    ? await db.client.findUnique({ where: { id: clientId } })
    : null;
  const companyId = await getCompanyId();
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
    <div className="gap-3 space-y-4 overflow-clip py-2 md:-my-2 md:min-h-[93vh] lg:grid lg:grid-cols-[1fr,24rem] lg:grid-rows-[auto,auto,1fr] lg:space-y-0">
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
      <div>
        <ConvertButton
          type={InvoiceType.Estimate}
          text="Save as Estimate"
          className="border-none bg-[#6470FF] text-white"
          icon={<EstimateLogo />}
        />
      </div>

      <Header />

      <Tabs
        defaultValue="create"
        className="col-start-1 flex min-h-0 flex-col overflow-clip"
      >
        <TabsList className="grid grid-cols-4 md:inline-flex">
          <TabsTriggerCreate value="payments" className="order-4 md:order-1">
            Payments
          </TabsTriggerCreate>
          <TabsTriggerCreate value="inspections" className="order-3 md:order-2">
            Inspections
          </TabsTriggerCreate>
          <TabsTriggerCreate value="attachment" className="order-2 md:order-3">
            Attachment
          </TabsTriggerCreate>
          <TabsTriggerCreate value="create" className="order-1 md:order-4">
            Create
          </TabsTriggerCreate>
        </TabsList>

        <TabsContent value="create" className="h-auto w-full">
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
                : undefined
            }
          />
        </TabsContent>
      </Tabs>

      <div className="app-shadow col-start-2 row-start-2 row-end-4 grid grid-rows-[1fr,auto,auto] divide-y rounded-md md:min-h-[85vh]">
        <Create />
        <BillSummary />
      </div>
    </div>
  );
}
