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
  const AI_SALES_AGENT = {
    id: 0,
    firstName: "Sales",
    lastName: "Agent",
    mobile: "",
    countryCode: "US",
    email: "",
    address: null,
    city: null,
    state: null,
    zip: null,
    isFleet: false,
    photo: "/images/default.png",
    fromRequest: false,
    fromRequestedCompanyId: null,
    sourceId: null,
    converted: false,
    companyId,
    createdAt: new Date(),
    updatedAt: new Date(),
    customerCompany: null,
    tagId: null,
    notes: "Temporary AI Sales Agent",
    leadId: null,
    firstContactTime: null,
    lastMailgunEmailReadId: null,
    isStarred: true,
    isAiAgent: true, // custom flag (important for logic)
    conversationsTrack: {
      id: 0,
      clientId: 0,
      emailIsRead: true,
      smsIsRead: true,
      emailIsUnReadCount: 0,
      smsUnReadCount: 0,
      emailLastMessage: "Hi! I'm your AI Sales Agent. How can I help you?",
      smsLastMessage: "",
      lastMessageBy: "Agent",
      lastEmailBy: "Agent",
      sendAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
  const clientsFromApi = await getClients({
    companyId,
    search: searchParams?.search,
    filter: searchParams?.filter,
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
