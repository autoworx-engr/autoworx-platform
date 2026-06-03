import React from "react";
import { getClientById } from "../_actions/getClientById";
import NoClientFound from "../_component/NoClientFound";

type TProps = {
  children: React.ReactNode;
  conversations: React.ReactNode;
  details: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function ClientLayout({
  conversations,
  details,
  params,
}: TProps) {
  const { id } = await params;
  const clientId = parseInt(id);
  const client = isNaN(clientId) ? null : await getClientById(clientId);

  if (!client) {
    return <NoClientFound />;
  }

  return (
    <div className="grid grid-cols-12 xl:gap-x-10">
      <div className="col-span-12 xl:col-span-5">{conversations}</div>
      <div className="col-span-12 xl:col-span-7">{details}</div>
    </div>
  );
}
