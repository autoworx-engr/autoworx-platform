import Title from "@/components/Title";
import Header from "../../dashboard/client/Header";
import { db } from "@/lib/db";
import ClientList from "../../dashboard/client/ClientList";

export default async function Page() {
  const clients = await db.client.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      tag: true,
      source: true,
      company: {
        select: { name: true },
      },
    },
  });

  return (
    <div className="h-full w-full space-y-8 bg-[#F8F9FA] px-2">
      <Title>Client List</Title>

      <Header />
      <ClientList needCompanyName={true} clients={clients} />
    </div>
  );
}
