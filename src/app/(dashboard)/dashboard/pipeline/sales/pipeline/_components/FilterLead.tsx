"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
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

  return (
    <div className="flex gap-2">
      <Select onValueChange={onValueChange} value={currentOrder || ""}>
        <SelectTrigger
          showIcon={false}
          className="bg-white h-11 hover:border-slate-200 hover:bg-slate-50/30 rounded-xl border-2 border-slate-100 justify-start outline-none focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10"
        >
          {/* <SelectValue className="flex gap-1 flex-row"> */}
          <Filter />{" "}
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
      {searchParams.orderBy && <ResetButton />}
    </div>
  );
}
