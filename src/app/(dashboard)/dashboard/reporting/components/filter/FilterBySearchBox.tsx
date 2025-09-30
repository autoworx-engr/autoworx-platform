"use client";
import { useDebounce } from "@/hooks/useDebounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CiSearch } from "react-icons/ci";
type TProps = {
  searchText: string;
};
export default function FilterBySearchBox({ searchText }: TProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    if (searchText) {
      setSearchTerm(searchText);
    }
  }, []);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    const searchParams = new URLSearchParams(params!);
    if (searchTerm === "") {
      searchParams.delete("search");
    } else {
      searchParams.set("search", searchTerm);
    }
    const newPath = `${pathname}?${searchParams.toString()}`;
    router.replace(newPath);
  };
  const handleSearchChange = useDebounce(handleInputChange, 500);

  const getPlaceholderForPath = () => {
    if (pathname.includes("revenue")) {
      return "search by invoice, customer, vehicle";
    } else if (pathname.includes("inventory")) {
      return "search by name";
    } else if (pathname.includes("payments")) {
      return "search by invoice, client, vehicle";
    } else if (pathname.includes("teams")) {
      return "search by employee name";
    }
  };

  return (
    <div className="relative w-full min-w-[300] max-w-[693px]">
      <CiSearch className="absolute left-[10px] top-[9px]" />
      <input
        onChange={(e) => {
          handleSearchChange(e);
          setSearchTerm(e.target.value);
        }}
        value={searchTerm}
        className="w-full rounded-sm border py-1 pl-8 focus:outline-none"
        type="text"
        placeholder={getPlaceholderForPath()}
      />
    </div>
  );
}
