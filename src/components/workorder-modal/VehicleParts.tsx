import { cn } from "@/lib/cn";
import { normalizeSearch } from "@/utils/normalizeSearch";
import { VehicleParts as Parts } from "@prisma/client";
import { Popconfirm } from "antd";
import { CircleX, X } from "lucide-react";
import { useEffect, useState } from "react";

const vehiclePartsItem = [
  { id: 1, label: "Front Bumper", value: "front-bumper", selected: false },
  { id: 2, label: "Hood", value: "hood", selected: false },
  { id: 3, label: "D. Fender", value: "D-fender", selected: false },
  { id: 4, label: "D. Front Door", value: "D-front-door", selected: false },
  { id: 5, label: "D. Rear Door", value: "D-rear-door", selected: false },
  { id: 6, label: "D. Side Skirt", value: "D-side-skirt", selected: false },
  {
    id: 7,
    label: "D. Quarter Panel",
    value: "D-quarter-panel",
    selected: false,
  },
  { id: 8, label: "D. Side Mirror", value: "D-side-mirror", selected: false },
  { id: 9, label: "Rear Bumper", value: "rear-bumper", selected: false },
  { id: 10, label: "Roof", value: "roof", selected: false },
  { id: 11, label: "Top Trunk", value: "top-trunk", selected: false },
  { id: 12, label: "Bottom Trunk", value: "bottom-trunk", selected: false },
  { id: 13, label: "Spoiler", value: "spoiler", selected: false },
  { id: 14, label: "Antenna", value: "antenna", selected: false },
  { id: 15, label: "P. Fender", value: "P-fender", selected: false },
  { id: 16, label: "P. Front Door", value: "P-front-door", selected: false },
  { id: 17, label: "P. Rear Door", value: "P-rear-door", selected: false },
  { id: 18, label: "P. Side Skirt", value: "P-side-skirt", selected: false },
  {
    id: 19,
    label: "P. Quarter Panel",
    value: "P-quarter-panel",
    selected: false,
  },
  { id: 20, label: "P. Side Mirror", value: "P-side-mirror", selected: false },
  { id: 21, label: "D. Roof Rail", value: "D-roof-rail", selected: false },
  { id: 22, label: "P. Roof Rail", value: "P-roof-rail", selected: false },
  {
    id: 23,
    label: "D. Front Fender Flare",
    value: "D-front-fender-flare",
    selected: false,
  },
  {
    id: 24,
    label: "D. Rear Fender Flare",
    value: "D-rear-fender-flare",
    selected: false,
  },
  {
    id: 25,
    label: "P. Front Fender Flare",
    value: "P-front-fender-flare",
    selected: false,
  },
  {
    id: 26,
    label: "P. Rear Fender Flare",
    value: "P-rear-fender-flare",
    selected: false,
  },
  {
    id: 27,
    label: "D. Front Door Handle",
    value: "D-front-door-handle",
    selected: false,
  },
  {
    id: 28,
    label: "D. Rear Door Handle",
    value: "D-rear-door-handle",
    selected: false,
  },
  {
    id: 29,
    label: "P. Front Door Handle",
    value: "P-front-door-handle",
    selected: false,
  },
  {
    id: 30,
    label: "P. Rear Door Handle",
    value: "P-rear-door-handle",
    selected: false,
  },
  { id: 31, label: "Roof Spoiler", value: "roof-spoiler", selected: false },
  {
    id: 32,
    label: "Hardware Removal",
    value: "hardware-removal",
    selected: false,
  },
  { id: 33, label: "D. Headlight", value: "D-headlight", selected: false },
  { id: 34, label: "P. Headlight", value: "P-headlight", selected: false },
  { id: 35, label: "D. Taillight", value: "D-taillight", selected: false },
  { id: 36, label: "P. Taillight", value: "P-taillight", selected: false },
  { id: 37, label: "D. Window Trim", value: "D-window-trim", selected: false },
  { id: 38, label: "P. Window Trim", value: "P-window-trim", selected: false },
  { id: 39, label: "Front Grille", value: "front-grille", selected: false },
];

type TProps = {
  fromEdit?: boolean;
  onSelectParts: (parts: { label: string; value: string }) => void;
  selectedParts: Partial<Parts>[];
  onRemoveParts: (parts: { label: string; value: string }) => void;
  isWriteAccess?: boolean;
};

export default function VehicleParts({
  fromEdit,
  onSelectParts,
  selectedParts,
  onRemoveParts,
  isWriteAccess = true,
}: TProps) {
  const [parts, setParts] = useState(vehiclePartsItem);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (fromEdit) {
      const selectedPartsName = selectedParts.map((part) => part?.partsName);
      const updatedParts = parts.map((part) => {
        if (selectedPartsName.includes(part.value)) {
          return { ...part, selected: true };
        }
        return part;
      });
      setParts(updatedParts);
    }
  }, [fromEdit]);

  const handleSelectParts = (vParts: { label: string; value: string }) => {
    const updatedParts = parts.map((part) => {
      if (part.value === vParts.value) {
        return { ...part, selected: true };
      }
      return part;
    });
    console.log({ updatedParts });
    setParts(updatedParts);
    onSelectParts({ label: vParts.label, value: vParts.value });
  };

  const handleRemoveParts = (vParts: { label: string; value: string }) => {
    const updatedParts = parts.map((part) => {
      if (part.value === vParts.value) {
        return { ...part, selected: false };
      }
      return part;
    });
    setParts(updatedParts);
    onRemoveParts({ label: vParts.label, value: vParts.value });
  };

  // Search filtering
  const filteredParts = searchTerm
    ? parts.filter((part) =>
        normalizeSearch(part.label).includes(normalizeSearch(searchTerm)),
      )
    : parts;

  const visibleParts = filteredParts.filter(
    (part) => isWriteAccess || part.selected,
  );

  return (
    <div>
      <div className="grid grid-cols-2 items-center justify-between gap-5">
        <h3 className="col-span-1 text-base">
          {isWriteAccess ? "Select" : "Selected"} Parts :
        </h3>

        <div className="relative col-span-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Parts..."
            className="w-full rounded border border-gray-300 px-3 py-1.5 pr-8 text-[12px] outline-none"
          />
          {searchTerm && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              onClick={() => setSearchTerm("")}
            >
              <X className="size-4" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex max-h-[120px] flex-wrap gap-2 overflow-y-auto p-2">
        {visibleParts?.length > 0 ? (
          visibleParts?.map((part) => (
            <div key={part.id} className="relative">
              {part.selected && isWriteAccess && (
                <Popconfirm
                  title={`Are you sure you want to delete this vehicle part?`}
                  onConfirm={async () => {
                    handleRemoveParts({
                      label: part.label,
                      value: part.value,
                    });
                  }}
                  okText="Yes"
                  cancelText="No"
                  overlayClassName="[&_.ant-popover-inner]:rounded-2xl [&_.ant-popover-inner]:p-4 [&_.ant-popover-message-title]:font-semibold [&_.ant-popover-message-title]:text-slate-800"
                  okButtonProps={{
                    className:
                      "!rounded-lg !border-none !bg-[#6571ff] !font-semibold !shadow-sm !shadow-[#6571ff]/30 hover:!bg-[#525ceb]",
                  }}
                  cancelButtonProps={{
                    className:
                      "!rounded-lg !border-slate-200 !font-medium !text-slate-600 hover:!border-slate-300 hover:!bg-slate-50 hover:!text-slate-700",
                  }}
                >
                  <button className="absolute -right-[4px] -top-[4px] z-20">
                    <CircleX className="size-5 rounded-full bg-background text-primary" />
                  </button>
                </Popconfirm>
              )}
              <button
                onClick={() => {
                  isWriteAccess &&
                    handleSelectParts({ label: part.label, value: part.value });
                }}
                type="button"
                className={cn(
                  "relative whitespace-nowrap rounded-full border border-gray-300 px-3 py-1.5 text-[12px]",
                  part.selected ? "bg-primary text-white" : "bg-background",
                )}
              >
                {part.label}
              </button>
            </div>
          ))
        ) : searchTerm ? (
          <div className="w-full py-4 text-center text-sm text-gray-500">
            No parts found matching &ldquo;{searchTerm}&ldquo;. Try a different
            search term.
          </div>
        ) : (
          <div className="w-full py-4 text-center text-sm text-gray-500">
            No parts available.
          </div>
        )}
      </div>
    </div>
  );
}
