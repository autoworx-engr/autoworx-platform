import { cn } from "@/lib/cn";
import { Search } from "lucide-react";

export function SidebarSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative mt-3">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        size={18}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="text"
        placeholder={placeholder}
        className={cn(
          "w-full rounded-md border bg-white pl-9 pr-9 py-2 text-sm text-zinc-700 placeholder-zinc-400 outline-none",
          "border-zinc-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20",
          "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200",
        )}
      />
    </div>
  );
}
