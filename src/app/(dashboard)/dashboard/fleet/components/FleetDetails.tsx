import InfoDetails from "./InfoDetails";
import { Client, Fleet, Invoice, Tag } from "@prisma/client";

type FleetDetailsProps = {
  fleet: Client & { fleet: Fleet | null; Invoice: Invoice[]; tag: Tag | null };
};

export default async function FleetDetails({ fleet }: FleetDetailsProps) {
  return (
    <div className="">
      <InfoDetails client={fleet} />
    </div>
  );
}
