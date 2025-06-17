"use client";
import { useClientCommunicationStore } from "@/stores/client-store";
import { Service, Vehicle } from "@prisma/client";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

type TProps = {
  vehicles: Partial<Vehicle>[];
  isLeadClient: boolean;
  services: Service[];
  singleService: string;
};

export default function VehicleDetails({
  vehicles,
  isLeadClient,
  services,
  singleService,
}: TProps) {
  // const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(0);

  const { selectedVehicleIndex, setVehicleIndex } =
    useClientCommunicationStore();
  return (
    <div className="mr-2 h-full space-y-4 rounded bg-[#63a6ac] p-4 text-sm text-white">
      <div className="flex h-[25%] items-center justify-between gap-x-8">
        <div>
          <span className="mr-4 font-semibold">
            Vehicle {selectedVehicleIndex + 1} Vehicle
          </span>
          <span className="">
            {vehicles[selectedVehicleIndex]?.year}{" "}
            {vehicles[selectedVehicleIndex]?.make}{" "}
            {vehicles[selectedVehicleIndex]?.model}
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
      <div className="h-[75%] pb-2">
        <p className="my-2 h-[10%] font-semibold">Service Requested :</p>

        {!isLeadClient ? (
          <ul className="thin-scrollbar h-[85%] list-inside list-disc overflow-y-auto">
            {services?.map((service, index) => (
              <>{service && <li key={index}>{service.name}</li>}</>
            ))}
          </ul>
        ) : (
          <ul className="list-inside list-disc">
            <li>{singleService}</li>
          </ul>
        )}
      </div>
    </div>
  );
}
