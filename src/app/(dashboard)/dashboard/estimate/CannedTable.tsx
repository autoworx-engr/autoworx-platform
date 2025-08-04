import { Category, Labor, Service } from "@prisma/client";
import CannedLabor from "./CannedLabor";
import CannedServices from "./CannedServices";

type Props = {
  labors: (Labor & { category: Category })[];
  services: (Service & { category: Category })[];
};

const CannedTable = (props: Props) => {
  return (
    <div className="flex min-h-[65vh] w-full flex-col rounded-md py-2 lg:flex-row  lg:gap-x-4">
      {/* canned labor */}
      <div className="w-full lg:basis-1/2 flex-1">
        <CannedLabor labors={props.labors} />
      </div>
      {/* <br /> */}
      {/* canned services */}
      <div className="w-full lg:basis-1/2 flex-1">
        <CannedServices services={props.services} />
      </div>
    </div>
  );
};

export default CannedTable;
