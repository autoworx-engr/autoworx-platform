"use client";

import { addVehicleColor } from "@/actions/vehicle/addVehicleColor";
import { getVehicleColors } from "@/actions/vehicle/getVehicleColor";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import FormError from "@/components/FormError";
import { SlimInput } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import { errorToast } from "@/lib/toast";
import { useFormErrorStore } from "@/stores/form-error";
import { VehicleColor } from "@prisma/client";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { useEffect, useState } from "react";

interface ColorSelectorProps {
  selectedColor: VehicleColor | null;
  onSelect: (color: VehicleColor | null) => void;
  label?: string;
}

export default function ColorSelector({
  selectedColor,
  onSelect,
  label = "Color",
}: ColorSelectorProps) {
  const [colorOpen, setColorOpen] = useState(false);
  const [colors, setColors] = useState<VehicleColor[]>([]);
  const [filteredColors, setFilteredColors] = useState<VehicleColor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch colors on component mount
  useEffect(() => {
    async function getColors() {
      const res = await getVehicleColors();
      if (res.type === "success") {
        setColors(res.data);
        setFilteredColors(res.data);
      } else if (res.type === "globalError") {
        errorToast("Failed to fetch colors");
      }
    }
    getColors();
  }, []);

  // Filter colors based on search query
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (query.trim() === "") {
      setFilteredColors(colors);
    } else {
      const filtered = colors.filter((color) =>
        color.name.toLowerCase().includes(query)
      );
      setFilteredColors(filtered);
    }
  };

  // Handle color selection
  const handleSelectColor = (color: VehicleColor) => {
    onSelect(color);
    setColorOpen(false);
    setSearchQuery("");
    setFilteredColors(colors);
  };

  useEffect(() => {
    setSearchQuery("");
  }, [colorOpen]);

  return (
    <div className="w-full">
      <label className="font-medium">{label}</label>
      <input type="hidden" name="colorId" value={selectedColor?.id || ""} />

      {/* Color selector */}
      <div className="relative w-full">
        <div
          className={`mt-1 flex h-[30px] w-full items-center justify-between rounded-sm border border-slate-400 px-2 ${
            selectedColor ? "bg-background" : ""
          }`}
          onClick={() => setColorOpen(!colorOpen)}
        >
          <p className="text-sm font-medium text-slate-400">
            {selectedColor
              ? selectedColor.name
              : `Select a ${label.toLowerCase()}`}
          </p>
          <button
            type="button"
            className="text-[#797979]"
            onClick={(e) => {
              e.stopPropagation();
              setColorOpen(!colorOpen);
            }}
          >
            {colorOpen ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>

        {colorOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border-2 border-slate-400 bg-background shadow-lg">
            <div className="relative m-2">
              <Search
                size={18}
                className="absolute left-2 top-1/2 -translate-y-1/2 transform text-[#797979]"
              />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full rounded-md border-2 border-slate-400 p-1 pl-6 pr-10 focus:outline-none"
              />
            </div>
            <div className="thin-scrollbar mb-5 max-h-16 overflow-y-auto">
              {filteredColors.map((color, i) => (
                <button
                  key={i}
                  type="button"
                  className="w-full p-1 px-2 text-left hover:bg-gray-100"
                  onClick={() => handleSelectColor(color)}
                >
                  <p>{color.name}</p>
                </button>
              ))}
              {filteredColors.length === 0 && (
                <p className="px-2 py-1 text-sm text-gray-500">
                  No matching colors found
                </p>
              )}
            </div>
            <div className="border-t-2 border-slate-400 p-2">
              <NewVehicleColor
                setColors={(newColors) => {
                  setColors(newColors);
                  setFilteredColors(newColors);
                }}
                setColor={onSelect}
                setColorOpen={setColorOpen}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// NewVehicleColor component to create a new color

export function NewVehicleColor({
  setColors,
  setColor,
  setColorOpen,
}: {
  setColors: React.Dispatch<React.SetStateAction<VehicleColor[]>>;
  setColor: (color: VehicleColor) => void;
  setColorOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: FormData) {
    const name = (data.get("name") as string)?.trim();

    // Simple client-side validation
    if (!name) {
      setError("Color name is required");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await addVehicleColor(name);
    setLoading(false);

    if (res.type === "success") {
      setColors((colors) => [...colors, res.data]);
      setOpen(false);
      setColor(res.data);
      setColorOpen(false);
    } else {
      // show error under input
      setError(res.message || "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="text-xs text-[#6571FF]">
          + New Color
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md grid-rows-[auto,1fr,auto]">
        <DialogHeader>
          <DialogTitle>Create Color</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="grid gap-3">
          <div className="flex flex-col gap-1">
            <SlimInput name="name" label="" placeholder="Enter color name" />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
          </div>

          <DialogFooter>
            {" "}
            <DialogClose className="rounded-lg border-2 border-slate-400 p-2">
              {" "}
              Cancel{" "}
            </DialogClose>{" "}
            <Submit
              className="rounded-lg border bg-[#6571FF] px-5 py-2 text-white"
              formAction={handleSubmit}
            >
              {" "}
              Add{" "}
            </Submit>{" "}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
