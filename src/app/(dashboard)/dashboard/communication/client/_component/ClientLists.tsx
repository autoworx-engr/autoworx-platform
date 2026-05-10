import { getCompanyId } from "@/lib/companyId";
import { getClients } from "../_actions/getClients";
import ClientFilter from "./ClientFilter";
import ClientInfinityScroll from "./ClientInfinityScroll";

const defaultTakeData = 20;

export default async function ClientLists() {
  const companyId = await getCompanyId();
  const clientsFromApi = await getClients({
    companyId,
    // Don't pass search/filter from URL - ClientFilter manages filter state via Zustand store
    // The ClientInfinityScroll component handles fetching filtered data based on store state
    take: defaultTakeData,
  });

  const clients = [...clientsFromApi];

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
