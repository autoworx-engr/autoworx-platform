import { Category, Labor, Service } from "@prisma/client";
import CannedLabor from "./CannedLabor";
import CannedServices from "./CannedServices";

type Props = {
  labors: (Labor & { category: Category })[];
  services: (Service & { category: Category })[];
};

const CannedTable = (props: Props) => {
  return (
    <div className="flex h-full w-full flex-col rounded-md py-1 lg:flex-row lg:items-start lg:gap-x-4">
      {/* canned labor */}
      <div className="w-full lg:basis-1/2">
        <CannedLabor labors={props.labors} />
      </div>
      <br />
      {/* canned services */}
      <div className="w-full lg:basis-1/2">
        <CannedServices services={props.services} />
      </div>
    </div>
  );
};

export default CannedTable;
