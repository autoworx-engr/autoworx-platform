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
import { SlimInput, slimInputClassName } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";
import { errorToast } from "@/lib/toast";
import { VehicleColor } from "@prisma/client";
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react";
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
        color.name.toLowerCase().includes(query),
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
    <div className="group flex w-full flex-col gap-1.5">
      <Label className="flex items-center gap-1 text-base">{label}</Label>
      {/* Color selector */}
      <div className="relative w-full">
        <input type="hidden" name="colorId" value={selectedColor?.id || ""} />
        <button
          type="button"
          className={cn(
            slimInputClassName,
            "items-center justify-between text-left",
          )}
          onClick={() => setColorOpen(!colorOpen)}
        >
          <span className={selectedColor ? "" : "text-muted-foreground"}>
            {selectedColor
              ? selectedColor.name
              : `Select a ${label.toLowerCase()}`}
          </span>
          <span className="shrink-0 opacity-60">
            {colorOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </button>

        {colorOpen && (
          <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg shadow-slate-200/60 dark:shadow-black/30">
            <div className="relative p-3 border-b border-slate-200 dark:border-slate-800">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 transform text-slate-400"
              />
              <input
                type="text"
                placeholder="Search Colors"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-9 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredColors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 rounded-sm dark:border-slate-800 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={() => handleSelectColor(color)}
                >
                  <span>{color.name}</span>
                  {color.id === selectedColor?.id && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              ))}
              {filteredColors.length === 0 && (
                <p className="px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
                  No matching colors found
                </p>
              )}
            </div>
            <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3">
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
        <button type="button" className="text-xs text-primary">
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
            <DialogClose
              className="
                rounded-xl mt-2 sm:mt-0 px-5 py-2.5 text-sm font-medium text-slate-500
                hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800
                transition-colors border
              "
            >
              Cancel
            </DialogClose>
            <Submit
              className="
                rounded-xl px-6 py-2.5 text-sm font-medium text-white
                bg-gradient-to-r from-primary to-[#5a66ee]
                shadow-lg shadow-indigo-500/30
                hover:shadow-xl hover:shadow-indigo-500/40
                hover:-translate-y-0.5 hover:scale-[1.02]
                active:translate-y-0 active:scale-100
                transition-all duration-200
              "
              formAction={handleSubmit}
            >
              Add
            </Submit>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
