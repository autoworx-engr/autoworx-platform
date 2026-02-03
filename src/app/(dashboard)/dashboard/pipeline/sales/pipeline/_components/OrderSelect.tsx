"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <SelectTrigger className="w-[180px] bg-white rounded-xl">
        <SelectValue placeholder="Select order" />
      </SelectTrigger>
      <SelectContent position="popper">
        <SelectGroup>
          <SelectItem value="asc">Newest</SelectItem>
          <SelectItem value="desc">Oldest</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
