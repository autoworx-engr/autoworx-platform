"use client";
import { useClientCommunicationStore } from "@/stores/client-store";
import { Service, Vehicle } from "@prisma/client";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

type TProps = {
  vehicles: Partial<Vehicle>[];
  isLeadClient: boolean;
  invoices: any[];
  singleService: string;
};

export default function VehicleDetails({
  vehicles,
  isLeadClient,
  invoices,
  singleService,
}: TProps) {
  // const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(0);

  const { selectedVehicleIndex, setVehicleIndex } =
    useClientCommunicationStore();

  const vehicle = vehicles?.[selectedVehicleIndex];

  const filterInvoiceByVehicleMake =
    invoices &&
    invoices.filter(
      (invoice) =>
        invoice?.vehicle?.model === vehicle?.model &&
        invoice?.vehicle?.make === vehicle?.make &&
        invoice?.vehicle?.year === vehicle?.year
    );

  const invoiceServices =
    filterInvoiceByVehicleMake &&
    filterInvoiceByVehicleMake.map((invoice) =>
      invoice?.invoiceItems.map((item: any) => item?.service)
    );
  const services =
    invoiceServices &&
    invoiceServices
      .flat()
      .filter((service): service is Service => service !== null);

  return (
    <div className="space-y-4 rounded bg-[#63a6ac] p-4 text-sm text-white">
      <div className="flex items-center justify-between gap-x-8">
        <div className="flex flex-col xl:flex-row">
          <span className="mr-4 font-semibold">
            Vehicle {selectedVehicleIndex + 1}
          </span>
          <span className="">
            {vehicle?.year || ""} {vehicle?.make} {vehicle?.model}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <FaArrowLeft
            onClick={() => {
              if (selectedVehicleIndex > 0) {
                setVehicleIndex(selectedVehicleIndex - 1);
              } else {
                setVehicleIndex(vehicles.length - 1);
              }
            }}
          />
          <FaArrowRight
            onClick={() => {
              if (selectedVehicleIndex < vehicles.length - 1) {
                setVehicleIndex(selectedVehicleIndex + 1);
              } else {
                setVehicleIndex(0);
              }
            }}
          />
        </div>
      </div>
      <div className="h-[40%] pb-3">
        <p className="my-2 h-[10%] font-semibold">Service Requested :</p>
        <ul className="thin-scrollbar h-[85%] list-inside list-disc overflow-y-auto">
          {services?.map((service, index) => (
            <>{service && <li key={index}>{service.name}</li>}</>
          ))}
        </ul>
        {/* {!isLeadClient ? (
          <ul className="thin-scrollbar h-[85%] list-inside list-disc overflow-y-auto">
            {services?.map((service, index) => (
              <>{service && <li key={index}>{service.name}</li>}</>
            ))}
          </ul>
        ) : (
          <ul className="list-inside list-disc">
            <li>{singleService}</li>
          </ul>
        )} */}
      </div>
    </div>
  );
}
