import Title from "@/components/Title";
import { getCompanyId } from "@/lib/companyId";
import { db } from "@/lib/db";
import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css"; // theme css file
import ClientList from "./ClientList";
import Header from "./Header";

export default async function Page() {
  const companyId = await getCompanyId();
  const clients = await db.client.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: { 
      tag: {
        where: { type: "CLIENT" }
      }, 
      source: true 
    },
  });

  return (
    <div className="h-full w-full space-y-8 px-2">
      <Title>Client List</Title>

      <Header />
      <ClientList clients={clients} />
    </div>
  );
}
