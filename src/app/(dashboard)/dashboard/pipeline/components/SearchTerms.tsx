import { cn } from "@/lib/cn";
import { useEstimateFilterStore } from "@/stores/estimate-filter";
import { Search } from "lucide-react";

export default function SearchTerms() {
  const { setFilter, search } = useEstimateFilterStore();

  return (
    <div className="relative flex-1 group">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary"
      />
      <input
        type="text"
        value={search}
        placeholder="Search by Work Order, Client, Vehicle or Service"
        className={cn(
          "w-full h-11 pl-12 pr-4 rounded-xl border-2 border-slate-100 bg-white",
          "text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none",
          "transition-all duration-300 ease-in-out",
          "hover:border-slate-200 hover:bg-slate-50/30",
          "focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10",
        )}
        onChange={(e) => {
          setFilter({ search: e.target.value });
        }}
      />
    </div>
  );
}
