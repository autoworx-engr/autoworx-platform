import { redirect } from "next/navigation";

const DEFAULT_TAB = "services";

const TAB_TO_ROUTE: Record<string, string> = {
  services: "services",
  deposits: "deposits",
  scheduling: "scheduling",
  financial: "financial",
  "gift-cards": "gift-cards",
  calendar: "calendar",
  estimates: "estimates",
};

type VirtualShopAdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const resolveTabRoute = (
  tabParam: string | string[] | undefined,
): string => {
  const tabValue = Array.isArray(tabParam) ? tabParam[0] : tabParam;
  const resolvedTab = tabValue && TAB_TO_ROUTE[tabValue]
    ? tabValue
    : DEFAULT_TAB;

  return TAB_TO_ROUTE[resolvedTab];
};

export default async function VirtualShopAdminPage({
  searchParams,
}: VirtualShopAdminPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const routeSegment = resolveTabRoute(resolvedSearchParams?.tab);

  redirect(`/dashboard/virtual-shop/admin/${routeSegment}`);
}

