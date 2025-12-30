import { Category, Labor, Service } from "@prisma/client";
import CannedLabor from "./CannedLabor";
import CannedMobileTabs from "./CannedMobileTabs";
import CannedServices from "./CannedServices";

type Props = {
  labors: (Labor & { category: Category })[];
  services: (Service & { category: Category })[];
};

const CannedTable = (props: Props) => {
  return (
    <div className="flex min-h-[65vh] w-full flex-col">
      {/* Mobile Tabs - Only visible on mobile */}
      <CannedMobileTabs labors={props.labors} services={props.services} />

      {/* Desktop View */}
      <div className="hidden lg:flex lg:flex-row lg:gap-x-4 flex-1 h-full">
        {/* Canned Labor Wrapper */}
        <div className="w-full lg:basis-1/2 flex flex-col flex-1 h-full">
          <CannedLabor labors={props.labors} />
        </div>

        {/* Canned Services Wrapper */}
        <div className="w-full lg:basis-1/2 flex flex-col flex-1 h-full">
          <CannedServices services={props.services} />
        </div>
      </div>
    </div>
  );
};

export default CannedTable;
