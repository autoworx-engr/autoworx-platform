import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import Header from "./components/Header";
import FleetList from "./components/FleetList";

export default async function Page() {
  const companyId = await getCompanyId();

  const clients = await db.client.findMany({
    where: { companyId, isFleet: true, NOT: { fleet: null } },
    orderBy: { createdAt: "desc" },
    include: { 
      tag: {
        where: { type: "CLIENT" }
      }, 
      source: true, 
      fleet: true 
    },
  });

  return (
    <div className="h-full w-full space-y-8 px-2">
      <Title>Fleet List</Title>

      <Header />
      <FleetList clients={clients} />
    </div>
  );
}
