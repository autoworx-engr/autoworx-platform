import { authOptions } from "@/authOptions";
import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import CannedTable from "../CannedTable";
import NavigationTabs from "../NavigationTabs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoices - Canned",
  description: "Manage your canned estimates",
};

type TProps = {
  searchParams: Promise<{
    laborCategory?: string;
    laborSearch?: string;
    laborPage?: string;
    laborTake?: string;
    serviceCategory?: string;
    serviceSearch?: string;
    servicePage?: string;
    serviceTake?: string;
  }>;
};

export default async function CannedPage(props: TProps) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;

  if (!companyId) {
    throw new Error("Company ID is required to create an email template.");
  }

  const defaultTake = 50;
  const laborPageFromSearch = Number.parseInt(
    searchParams.laborPage || "1",
    10,
  );
  const laborTakeFromSearch = Number.parseInt(
    searchParams.laborTake || String(defaultTake),
    10,
  );
  const servicePageFromSearch = Number.parseInt(
    searchParams.servicePage || "1",
    10,
  );
  const serviceTakeFromSearch = Number.parseInt(
    searchParams.serviceTake || String(defaultTake),
    10,
  );

  const laborPage =
    Number.isNaN(laborPageFromSearch) || laborPageFromSearch < 1
      ? 1
      : laborPageFromSearch;
  const laborTake =
    Number.isNaN(laborTakeFromSearch) || laborTakeFromSearch < 1
      ? defaultTake
      : laborTakeFromSearch;
  const servicePage =
    Number.isNaN(servicePageFromSearch) || servicePageFromSearch < 1
      ? 1
      : servicePageFromSearch;
  const serviceTake =
    Number.isNaN(serviceTakeFromSearch) || serviceTakeFromSearch < 1
      ? defaultTake
      : serviceTakeFromSearch;

  const laborSearch = searchParams.laborSearch?.trim();
  const serviceSearch = searchParams.serviceSearch?.trim();

  const laborWhere: Prisma.LaborWhereInput = {
    companyId,
    cannedLabor: true,
    ...(searchParams.laborCategory
      ? {
          category: {
            is: {
              name: searchParams.laborCategory,
            },
          },
        }
      : {}),
    ...(laborSearch
      ? {
          OR: [
            {
              name: {
                contains: laborSearch,
                mode: "insensitive",
              },
            },
            {
              category: {
                is: {
                  name: {
                    contains: laborSearch,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const serviceWhere: Prisma.ServiceWhereInput = {
    companyId,
    canned: true,
    ...(searchParams.serviceCategory
      ? {
          category: {
            is: {
              name: searchParams.serviceCategory,
            },
          },
        }
      : {}),
    ...(serviceSearch
      ? {
          OR: [
            {
              name: {
                contains: serviceSearch,
                mode: "insensitive",
              },
            },
            {
              category: {
                is: {
                  name: {
                    contains: serviceSearch,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [
    laborTotal,
    labors,
    serviceTotal,
    services,
    categories,
    tags,
    statuses,
  ] = await db.$transaction([
    db.labor.count({ where: laborWhere }),
    db.labor.findMany({
      where: laborWhere,
      include: { category: true },
      orderBy: { id: "desc" },
      skip: (laborPage - 1) * laborTake,
      take: laborTake,
    }),
    db.service.count({ where: serviceWhere }),
    db.service.findMany({
      where: serviceWhere,
      include: { category: true },
      orderBy: { id: "desc" },
      skip: (servicePage - 1) * serviceTake,
      take: serviceTake,
    }),
    db.category.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    }),
    db.tag.findMany({ where: { companyId, type: "GENERAL" } }),
    db.column.findMany({ where: { companyId } }),
  ]);

  return (
    <div className="p-2 md:p-0">
      <Title>Canned</Title>

      <SyncLists categories={categories} tags={tags} statuses={statuses} />

      {/* <Header /> */}

      {/* Use the NavigationTabs component with the 'c-canned' tab as active */}
      <NavigationTabs activeTab="c-canned">
        <CannedTable
          labors={labors as any}
          laborTotal={laborTotal}
          laborPage={laborPage}
          laborTake={laborTake}
          services={services as any}
          serviceTotal={serviceTotal}
          servicePage={servicePage}
          serviceTake={serviceTake}
          categories={categories}
        />
      </NavigationTabs>
    </div>
  );
}
