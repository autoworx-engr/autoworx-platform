"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { Filter } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import ResetButton from "./ResetButton";

export default function FilterLead({ searchParams }: { searchParams: any }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentOrder = searchParams.orderBy || undefined;

  const onValueChange = (value: string) => {
    const params = new URLSearchParams();
    // if (searchParams.searchTerm) {
    //   params.set("searchTerm", searchParams.searchTerm);
    // }
    params.set("orderBy", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const isFilterApplied = Boolean(currentOrder);

  return (
    <div className="flex gap-2">
      <div className="relative">
        <Select onValueChange={onValueChange} value={currentOrder || ""}>
          <SelectTrigger
            showIcon={false}
            className={cn(
              "bg-white h-11 hover:border-slate-200 hover:bg-slate-50/30 rounded-xl border-2 border-slate-100 justify-start outline-none focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10",
              isFilterApplied && "border-primary/40 bg-primary/5",
            )}
          >
            {/* <SelectValue className="flex gap-1 flex-row"> */}
            <Filter
              className={isFilterApplied ? "text-primary" : undefined}
            />{" "}
            {currentOrder === "asc"
              ? "Oldest"
              : currentOrder === "desc"
                ? "Newest"
                : "Sort"}
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectGroup>
              <SelectItem value="desc">Newest</SelectItem>
              <SelectItem value="asc">Oldest</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        {isFilterApplied && (
          <span className="pointer-events-none absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
        )}
      </div>
      {searchParams.orderBy && <ResetButton />}
    </div>
  );
}
