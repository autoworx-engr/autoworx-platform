import FleetSubHeading from "./FleetSubHeading";
import InfoDetails from "./InfoDetails";

export type fleetType = {
  fleetName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  isVip: boolean;
  behaviorTag: string;
};
export type InfoType = Record<string, number>;

export default async function FleetDetails({
  fleet,
  info,
}: {
  fleet: any;
  info: InfoType;
}) {
  return (
    <div className="">
      {/* <FleetSubHeading text="Fleet Details" className="md:ml-6" /> */}

      <InfoDetails client={fleet} />
    </div>
  );
}
