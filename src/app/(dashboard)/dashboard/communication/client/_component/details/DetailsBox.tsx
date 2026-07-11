import { db } from "@/lib/db";
import { getClientById } from "../../_actions/getClientById";
import ClientDescription from "./ClientDescription";
import ClientHeading from "./ClientHeading";

type Props = {
  clientId: number;
  showDetails: string;
};

export default async function DetailsBox({ clientId, showDetails }: Props) {
  const clientPromise = getClientById(clientId);
  const vehiclesPromise = db.vehicle.findMany({
    where: { clientId },
    select: {
      id: true,
      year: true,
      make: true,
      model: true,
      other: true,
      license: true,
      vin: true,
      color: { select: { name: true } },
    },
  });
  const [client, vehicles] = await Promise.all([
    clientPromise,
    vehiclesPromise,
  ]);

  if (!client) return null;

  const showDetailsClass = showDetails === "true" ? "flex" : "hidden";
  return (
    <div
      className={`app-shadow mt-3 flex-col rounded-lg bg-background pb-4 lg:mt-0 lg:h-[90vh] xl:flex ${showDetailsClass}`}
    >
      {/* Client Heading */}
      <ClientHeading vehicles={vehicles} client={client} />

      {/* Client Description */}
      <ClientDescription vehicles={vehicles} client={client} />
    </div>
  );
}
