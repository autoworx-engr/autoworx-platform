import { slimInputClassName } from "@/components/SlimInput";
import { carParts } from "@/constants/car-parts";
import { cn } from "@/lib/cn";
import { InspectionType } from "@/stores/estimate-create";
import NotesTextArea from "../../templates/NotesTextArea";

interface InspectionsTabsProps {
  inspections: InspectionType[];
  updateInspection: (index: number, inspection: InspectionType) => void;
  damageNotes: string | null;
  setDamageNotes: (damageNotes: string) => void;
}

const InspectionsTab: React.FC<InspectionsTabsProps> = ({
  inspections,
  updateInspection,
  damageNotes,
  setDamageNotes,
}) => {
  const findInspectionIndex = (title: string) =>
    inspections.findIndex((i) => i.title === title);

  const handleCheckboxChange = (
    part: string,
    field: "driver" | "passenger",
  ) => {
    const inspectionIndex = findInspectionIndex(part);

    const existingInspection =
      inspectionIndex !== -1
        ? inspections[inspectionIndex]
        : {
            title: part,
            driver: false,
            passenger: false,
            notes: "",
          };

    const updatedInspection = {
      ...existingInspection,
      [field]: !existingInspection[field],
    };

    updateInspection(
      inspectionIndex !== -1 ? inspectionIndex : inspections.length,
      updatedInspection,
    );
  };

  const handleNotesChange = (part: string, notes: string) => {
    const inspectionIndex = findInspectionIndex(part);

    const existingInspection =
      inspectionIndex !== -1
        ? inspections[inspectionIndex]
        : {
            title: part,
            driver: false,
            passenger: false,
            notes: "",
          };

    const updatedInspection = {
      ...existingInspection,
      notes,
    };

    updateInspection(
      inspectionIndex !== -1 ? inspectionIndex : inspections.length,
      updatedInspection,
    );
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

      <div className="max-h-80 overflow-y-auto thin-scrollbar">
        {carParts.map((part, index) => {
          // Find if this car part exists in inspections by title
          const existingInspection = inspections.find(
            (inspection) => inspection.title === part,
          );

          return (
            <div
              key={index}
              className="grid grid-cols-8 items-center gap-1 border-b border-gray-200 p-1 text-xs md:gap-2 md:p-2 md:text-base"
            >
              {/* Car Part Name */}
              <div className="col-span-2 truncate text-slate-500 font-semibold">
                {part}
              </div>

              <div className="col-span-1 ml-12 flex justify-center gap-4 xl:ml-5 2xl:ml-6 2xl:justify-start">
                {/* Driver Checkbox */}
                <label className="group relative flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={existingInspection?.driver || false}
                    onChange={() => handleCheckboxChange(part, "driver")}
                  />
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-lg border-2 transition-all duration-200 md:h-6 md:w-6",
                      "border-slate-200 bg-white shadow-sm",
                      "peer-checked:border-primary peer-checked:bg-primary peer-checked:shadow-md peer-checked:shadow-primary/20",
                      "group-hover:border-primary/50 peer-focus:ring-2 peer-focus:ring-primary/20",
                    )}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={cn(
                        "h-3 w-3 transition-all duration-200 md:h-3.5 md:w-3.5",
                        existingInspection?.driver
                          ? "scale-100 opacity-100"
                          : "scale-50 opacity-0",
                      )}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </label>

                {/* Passenger Checkbox */}
                <label className="group relative flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={existingInspection?.passenger || false}
                    onChange={() => handleCheckboxChange(part, "passenger")}
                  />
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-lg border-2 transition-all duration-200 md:h-6 md:w-6",
                      "border-slate-200 bg-white shadow-sm",
                      "peer-checked:border-primary peer-checked:bg-primary peer-checked:shadow-md peer-checked:shadow-primary/20",
                      "group-hover:border-primary/50 peer-focus:ring-2 peer-focus:ring-primary/20",
                    )}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={cn(
                        "h-3 w-3 transition-all duration-200 md:h-3.5 md:w-3.5",
                        existingInspection?.passenger
                          ? "scale-100 opacity-100"
                          : "scale-50 opacity-0",
                      )}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </label>
              </div>

              {/* Notes Input */}
              <div className="col-span-5 ml-10 flex items-center space-x-1 md:ml-10 md:space-x-2">
                <input
                  type="text"
                  placeholder="Notes..."
                  className={cn(slimInputClassName)}
                  value={existingInspection?.notes || ""}
                  onChange={(e) => handleNotesChange(part, e.target.value)}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* Damage Notes */}
      <div>
        <h1 className="mb-2 mt-4 text-[16px] font-bold">Damage Notes</h1>
        <NotesTextArea
          value={damageNotes ?? ""}
          onChange={setDamageNotes}
          placeholder="Enter your notes here..."
          name="damage-notes"
        />
      </div>
    </div>
  );
};

export default InspectionsTab;
