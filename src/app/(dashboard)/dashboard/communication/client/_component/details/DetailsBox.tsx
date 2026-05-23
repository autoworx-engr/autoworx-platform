import { db } from "@/lib/db";
import { getClientById } from "../../_actions/getClientById";
import ClientDescription from "./ClientDescription";
import ClientHeading from "./ClientHeading";
import NoClientFound from "../NoClientFound";

type Props = {
  clientId: number;
  showDetails: string;
};

export default async function DetailsBox({ clientId, showDetails }: Props) {
  const clientPromise = getClientById(clientId);
  const vehiclesPromise = db.vehicle.findMany({
    where: { clientId },
    include: { color: true },
  });
  const [client, vehicles] = await Promise.all([
    clientPromise,
    vehiclesPromise,
  ]);

  if (!client) return <NoClientFound />;

  const showDetailsClass = showDetails === "true" ? "block" : "hidden";
  return (
    <div
      className={`app-shadow mt-3 flex flex-col rounded-lg bg-background lg:mt-0 lg:h-[90vh] xl:flex ${showDetailsClass}`}
    >
      <ClientHeading vehicles={vehicles} client={client} />
      <ClientDescription vehicles={vehicles} client={client} />
    </div>
  );
}
