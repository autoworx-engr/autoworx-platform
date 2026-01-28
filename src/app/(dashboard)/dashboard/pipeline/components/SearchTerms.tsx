import { useEstimateFilterStore } from "@/stores/estimate-filter";
import { Search } from "lucide-react";

export default function SearchTerms() {
  const { setFilter } = useEstimateFilterStore();

  return (
    <div className="relative min-w-0 flex-1">
      <Search size={18} className="absolute left-3 top-3 text-gray-400" />
      <input
        type="text"
<<<<<<< HEAD
        placeholder="Search by Work Order, Client, Vehicle or Service"
        className={cn(
          "w-full h-11 pl-12 pr-4 rounded-xl border-2 border-slate-100 bg-white",
          "text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none",
          "transition-all duration-300 ease-in-out",
          "hover:border-slate-200 hover:bg-slate-50/30",
          "focus:border-[#6571FF]/40 focus:bg-white focus:ring-4 focus:ring-[#6571FF]/10",
        )}
=======
        placeholder="Search "
        className="w-full rounded border border-gray-300 p-2 pl-10"
>>>>>>> 562aae035edd611117b1950291edabf2b6d02c1d
        onChange={(e) => {
          setFilter({ search: e.target.value });
        }}
      />
    </div>
  );
}
