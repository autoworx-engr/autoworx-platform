import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import { getPaddedIdSearchCondition } from "@/lib/padId";
import { Prisma } from "@prisma/client";
import Header from "./components/Header";
import FleetList from "./components/FleetList";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Directory - Fleet",
  description: "Manage your fleets",
};

type TProps = {
  searchParams: Promise<{
    search?: string;
    page?: string;
    take?: string;
  }>;
};

export default async function Page(props: TProps) {
  const searchParams = await props.searchParams;
  const companyId = await getCompanyId();
  const defaultTake = 10;

  const pageFromSearch = Number.parseInt(searchParams.page || "1", 10);
  const takeFromSearch = Number.parseInt(
    searchParams.take || String(defaultTake),
    10,
  );

  const page =
    Number.isNaN(pageFromSearch) || pageFromSearch < 1 ? 1 : pageFromSearch;
  const take =
    Number.isNaN(takeFromSearch) || takeFromSearch < 1
      ? defaultTake
      : takeFromSearch;

  const trimmedSearch = searchParams.search?.trim();

  const containsInsensitive = (value: string): Prisma.StringFilter => ({
    contains: value,
    mode: "insensitive",
  });

  const filterWhere: Prisma.ClientWhereInput = {
    companyId,
    isFleet: true,
    NOT: { fleet: null },
  };

  if (trimmedSearch) {
    const orFilters: Prisma.ClientWhereInput[] = [
      {
        firstName: {
          ...containsInsensitive(trimmedSearch),
        },
      },
      {
        lastName: {
          ...containsInsensitive(trimmedSearch),
        },
      },
      {
        email: {
          ...containsInsensitive(trimmedSearch),
        },
      },
      {
        mobile: {
          ...containsInsensitive(trimmedSearch),
        },
      },
      {
        fleet: {
          is: {
            fleetName: {
              ...containsInsensitive(trimmedSearch),
            },
          },
        },
      },
      {
        fleet: {
          is: {
            contactName: {
              ...containsInsensitive(trimmedSearch),
            },
          },
        },
      },
    ];

    const idCondition = getPaddedIdSearchCondition(trimmedSearch);
    if (idCondition) orFilters.push(idCondition);

    const [firstNameTerm, ...lastNameParts] = trimmedSearch.split(/\s+/);
    const lastNameTerm = lastNameParts.join(" ");

    if (firstNameTerm && lastNameTerm) {
      orFilters.push({
        AND: [
          {
            firstName: {
              ...containsInsensitive(firstNameTerm),
            },
          },
          {
            lastName: {
              ...containsInsensitive(lastNameTerm),
            },
          },
        ],
      });
    }

    filterWhere.OR = orFilters;
  }

  const [total, clients] = await db.$transaction([
    db.client.count({
      where: filterWhere,
    }),
    db.client.findMany({
      where: filterWhere,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      include: {
        tag: {
          where: { type: "CLIENT" },
        },
        source: true,
        fleet: true,
      },
    }),
  ]);

  return (
    <div className="h-full w-full space-y-8 px-2">
      <Title>Fleet List</Title>

      <Header initialSearch={trimmedSearch || ""} />
      <FleetList clients={clients} total={total} page={page} take={take} />
    </div>
  );
}
