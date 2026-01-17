import { authOptions } from "@/authOptions";
import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { db } from "@/lib/db";
import { normalizeSearch } from "@/utils/normalizeSearch";
import { getServerSession } from "next-auth";
import CannedTable from "../CannedTable";
import NavigationTabs from "../NavigationTabs";

type TProps = {
  searchParams: {
    category?: string;
    search?: string;
    page?: string;
    take?: string;
  };
};

export default async function CannedPage({ searchParams }: TProps) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.companyId;

  if (!companyId) {
    throw new Error("Company ID is required to create an email template.");
  }

  const defaultTake = 50;
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const take = searchParams.take
    ? parseInt(searchParams.take, 10)
    : defaultTake;

  // const skip = (page - 1) * take;

  const labors = await db.labor.findMany({
    where: { companyId, cannedLabor: true },
    include: { category: true },
  });

  const services = await db.service.findMany({
    where: { companyId, canned: true },
    include: { category: true },
  });

  const categories = await db.category.findMany({ where: { companyId } });

  const tags = await db.tag.findMany({ where: { companyId, type: "GENERAL" } });
  const statuses = await db.column.findMany({ where: { companyId } });

  const searchTerm = searchParams.search
    ? normalizeSearch(searchParams.search)
    : "";

  const filteredLabors = labors.filter((labor) => {
    const nameMatch = normalizeSearch(labor?.name).includes(searchTerm);
    const categoryMatch = normalizeSearch(labor?.category?.name || "").includes(
      searchTerm
    );

    let categoryFilter = true;
    if (searchParams.category) {
      categoryFilter = labor?.category?.name === searchParams?.category;
    }

    return (nameMatch || categoryMatch) && categoryFilter;
  });

  const filteredServices = services.filter((service) => {
    const nameMatch = normalizeSearch(service?.name).includes(searchTerm);
    const categoryMatch = normalizeSearch(
      service.category?.name || ""
    ).includes(searchTerm);

    let categoryFilter = true;
    if (searchParams.category) {
      categoryFilter = service?.category?.name === searchParams.category;
    }

    return (nameMatch || categoryMatch) && categoryFilter;
  });

  const startIndex = (page - 1) * take;
  const endIndex = startIndex + take;
  const paginatedLabors = filteredLabors.slice(startIndex, endIndex);
  const paginatedServices = filteredServices.slice(startIndex, endIndex);

  return (
    <>
      <Title>Canned</Title>

      <SyncLists categories={categories} tags={tags} statuses={statuses} />

      {/* <Header /> */}

      {/* Use the NavigationTabs component with the 'c-canned' tab as active */}
      <NavigationTabs activeTab="c-canned">
        <CannedTable labors={labors as any} services={services as any} />
      </NavigationTabs>
    </>
  );
}
