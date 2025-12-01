import { Category, Labor, Service } from "@prisma/client";
import CannedLabor from "./CannedLabor";
import CannedServices from "./CannedServices";

type Props = {
  labors: (Labor & { category: Category })[];
  services: (Service & { category: Category })[];
};

const CannedTable = (props: Props) => {
  return (
   <div className="flex min-h-[65vh] w-full flex-col py-2 lg:flex-row lg:gap-x-4">
      {/* Canned Labor Wrapper */}
      {/* 2. Ensure inner wrappers use h-full to inherit the height and grow with flex-1 */}
      <div className="w-full lg:basis-1/2 flex flex-col flex-1 h-full"> 
        <CannedLabor labors={props.labors} />
      </div>

      {/* Canned Services Wrapper */}
      <div className="w-full lg:basis-1/2 flex flex-col flex-1 h-full mt-4 lg:mt-0"> 
        <CannedServices services={props.services} />
      </div>
    </div>
  );
};

export default CannedTable;
