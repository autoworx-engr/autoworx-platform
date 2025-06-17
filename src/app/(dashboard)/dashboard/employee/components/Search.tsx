import { useEmployeeWorkFilterStore } from "@/stores/employeeWorkFilter";
import { IoIosSearch } from "react-icons/io";

export default function Search() {
  const { setFilter } = useEmployeeWorkFilterStore();

  return (
    <div className="relative min-w-0 flex-1">
      <IoIosSearch className="absolute left-3 top-3 text-gray-400" />
      <input
        type="text"
        placeholder="Search..."
        className="w-full rounded border border-gray-300 p-2 pl-10"
        onChange={(e) => {
          setFilter({ search: e.target.value });
        }}
      />
    </div>
  );
}
