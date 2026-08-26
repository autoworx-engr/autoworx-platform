import { Category, Labor, Service } from "@prisma/client";
import CannedLabor from "./CannedLabor";
import CannedMobileTabs from "./CannedMobileTabs";
import CannedServices from "./CannedServices";

type Props = {
  labors: (Labor & { category: Category })[];
  laborTotal: number;
  laborPage: number;
  laborTake: number;
  services: (Service & { category: Category })[];
  serviceTotal: number;
  servicePage: number;
  serviceTake: number;
  categories: Category[];
};

const CannedTable = (props: Props) => {
  return (
    <div className="flex min-h-[65vh] w-full flex-col">
      {/* Mobile Tabs - Only visible on mobile */}
      <CannedMobileTabs
        labors={props.labors}
        laborTotal={props.laborTotal}
        laborPage={props.laborPage}
        laborTake={props.laborTake}
        services={props.services}
        serviceTotal={props.serviceTotal}
        servicePage={props.servicePage}
        serviceTake={props.serviceTake}
        categories={props.categories}
      />

      {/* Desktop View */}
      <div className="hidden h-full flex-1 lg:flex lg:flex-row lg:gap-x-4">
        {/* Canned Labor Wrapper */}
        <div className="flex h-full min-w-0 flex-1 flex-col lg:basis-1/2">
          <CannedLabor
            labors={props.labors}
            total={props.laborTotal}
            page={props.laborPage}
            take={props.laborTake}
            categories={props.categories}
            compact
          />
        </div>

        {/* Canned Services Wrapper */}
        <div className="flex h-full min-w-0 flex-1 flex-col lg:basis-1/2">
          <CannedServices
            services={props.services}
            total={props.serviceTotal}
            page={props.servicePage}
            take={props.serviceTake}
            categories={props.categories}
            compact
          />
        </div>
      </div>
    </div>
  );
};

export default CannedTable;
