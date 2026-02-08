"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function OrderSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentOrder = searchParams.get("orderBy") || undefined;

  const onValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("orderBy", value);
    router.push(`${pathname}?${params.toString()}`);
  };
  console.log({ currentOrder });

  return (
    <Select onValueChange={onValueChange} defaultValue={currentOrder}>
      <SelectTrigger className="bg-white h-11 hover:border-slate-200 hover:bg-slate-50/30 rounded-xl border-2 border-slate-100 justify-start outline-none focus:border-[#6571FF]/40 focus:bg-white focus:ring-4 focus:ring-[#6571FF]/10">
        {/* <SelectValue className="flex gap-1 flex-row"> */}
        <Filter />{" "}
        {currentOrder === "asc"
          ? "Oldest"
          : currentOrder === "desc"
            ? "Newest"
            : "Select order"}
        {/* </SelectValue> */}
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectGroup>
          {/* <SelectItem value="">Select All</SelectItem> */}
          <SelectItem value="desc">Newest</SelectItem>
          <SelectItem value="asc">Oldest</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
