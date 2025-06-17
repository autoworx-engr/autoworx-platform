"use client";
import { useEstimateCreateStore } from "@/stores/estimate-create";

const InspectionsTab: React.FC = () => {
  const { inspections, updateInspection, damageNotes, setDamageNotes } =
    useEstimateCreateStore();

  const carParts: string[] = [
    "Front Bumper",
    "Hood",
    "Fender",
    "Front Door",
    "Rocker Panel",
    "Quarter Panel",
    "Roof",
    "Trunk",
    "Back Bumper",
    "Side Mirror",
    "Door Handles",
    "Spoiler",
    "Flares",
    "Side Skirts",
    "Antenna",
  ];

  const handleCheckboxChange = (
    index: number,
    field: "driver" | "passenger",
  ) => {
    const existingInspection = inspections[index] ?? {
      title: carParts[index],
      driver: false,
      passenger: false,
      notes: "",
    };

    const updatedInspection = {
      ...existingInspection,
      title: carParts[index],
      [field]: !existingInspection[field],
    };
    updateInspection(index, updatedInspection);
  };

  const handleNotesChange = (index: number, notes: string) => {
    const existingInspection = inspections[index] ?? {
      title: carParts[index],
      driver: false,
      passenger: false,
      notes: "",
    };

    const updatedInspection = {
      ...existingInspection,
      title: carParts[index],
      notes,
    };
    updateInspection(index, updatedInspection);
  };
  return (
    <div className="mx-auto w-full p-2 md:p-4">
      {/* Table Header */}
      <div className="grid grid-cols-8 gap-1 rounded-t-lg bg-[#E0E3FF] p-1 text-xs font-semibold md:gap-2 md:p-2 md:text-base">
        <div className="col-span-2"></div>
        <div className="col-span-1 flex items-center gap-2 text-center">
          <div>Driver</div>
          <div>Passenger</div>
        </div>
        <div className="col-span-5 text-center">Notes</div>
      </div>
      {/* Table Body */}
      <div className="max-h-80 overflow-y-auto md:max-h-96">
        {carParts.map((part, index) => (
          <div
            key={index}
            className="grid grid-cols-8 items-center gap-1 border-b border-gray-200 p-1 text-xs md:gap-2 md:p-2 md:text-base"
          >
            {/* Car Part Name */}
            <div className="col-span-2 truncate">{part}</div>

            <div className="col-span-1 ml-12 flex justify-center xl:ml-5 2xl:ml-6 2xl:justify-start">
              {/* Driver Checkbox */}
              <div>
                <input
                  type="checkbox"
                  className="mr-3 h-3 w-3 text-blue-600 md:h-5 md:w-5"
                  checked={inspections[index]?.driver || false}
                  onChange={() => handleCheckboxChange(index, "driver")}
                />
              </div>

              {/* Passenger Checkbox */}
              <div>
                <input
                  type="checkbox"
                  className="mr-4 h-3 w-3 text-blue-600 md:h-5 md:w-5"
                  checked={inspections[index]?.passenger || false}
                  onChange={() => handleCheckboxChange(index, "passenger")}
                />
              </div>
            </div>

            {/* Notes Input */}
            <div className="col-span-5 ml-6 flex items-center space-x-1 md:ml-10 md:space-x-2">
              <input
                type="text"
                placeholder="Notes..."
                className="ml-10 w-full rounded border border-gray-300 p-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 md:p-1 md:text-sm"
                value={inspections[index]?.notes || ""}
                onChange={(e) => handleNotesChange(index, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
      {/* Damage Notes */}
      <div>
        <h1 className="mb-2 mt-4 text-[16px] font-bold">Damage Notes</h1>
        <textarea
          value={damageNotes ?? ""}
          className="h-[107px] w-full resize-y rounded-md border-2 border-gray-300 p-2 focus:border-[#E0E3FF] focus:outline-none"
          placeholder="Enter your notes here..."
          onChange={(e) => setDamageNotes(e.target.value)}
        />
      </div>
    </div>
  );
};

export default InspectionsTab;
