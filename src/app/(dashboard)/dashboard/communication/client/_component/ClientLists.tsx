import { getCompanyId } from "@/lib/companyId";
import { getClients } from "../_actions/getClients";
import ClientFilter from "./ClientFilter";
import ClientInfinityScroll from "./ClientInfinityScroll";

type TProps = {
  searchParams?: {
    filter: string;
    search: string;
  };
};

const defaultTakeData = 20;

export default async function ClientLists({ searchParams }: TProps) {
  const companyId = await getCompanyId();

  const clients = await getClients({
    companyId,
    search: searchParams?.search,
    filter: searchParams?.filter,
    take: defaultTakeData,
  });

  return (
    <div
      style={{ overflowAnchor: "none" }}
      // className={`app-shadow mt-3 h-full overflow-hidden rounded-lg border border-emerald-700 bg-background p-3 lg:mt-0 lg:block lg:h-[90vh]`}
      className={`app-shadow mt-3 h-[90vh] overflow-hidden rounded-lg border border-emerald-700 bg-background p-2 md:p-3 lg:mt-0 lg:block`}
      id="client-message-lists"
    >
      {/* Header */}
      {/* <h2 className="text-[14px] text-[#797979]">Client List</h2> */}

      {/* Search */}
      <ClientFilter />

      {/* List */}
      <ClientInfinityScroll
        defaultTakeData={defaultTakeData}
        clients={clients}
        companyId={companyId}
      />
    </div>
  );
}
