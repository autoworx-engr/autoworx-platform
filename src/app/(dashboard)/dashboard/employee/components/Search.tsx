import { useEmployeeWorkFilterStore } from "@/stores/employeeWorkFilter";
import { Search as IoSearch } from "lucide-react";

export default function Search() {
  const { setFilter } = useEmployeeWorkFilterStore();
  const pathname = window.location.pathname;

  return (
    <div className="relative min-w-0 flex-1">
      <IoSearch className=" w-5 h-5 absolute left-3 top-3 text-gray-400" />
      <input
        type="text"
        placeholder={`Search by ${pathname.includes("employee") ? "Invoice ID, Name, Vehicle" : "name"}`}
        className="w-full rounded border border-gray-300 p-2 pl-10"
        onChange={(e) => {
          setFilter({ search: e.target.value });
        }}
      />
    </div>
  );
}
