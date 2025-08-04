import { useState } from "react";
import { useEmployeeWorkFilterStore } from "@/stores/employeeWorkFilter";

export default function Filter() {
  const [status, setStatus] = useState<string>("");
  const { setFilter } = useEmployeeWorkFilterStore();

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setFilter({ status: newStatus });
  };

  return (
    <select
      className="block w-full cursor-pointer rounded-lg border border-gray-400 p-2 text-gray-400 outline-none hover:border-blue-600"
      value={status}
      onChange={handleStatusChange}
    >
      <option value="All">All</option>
      <option value="Pending">Pending</option>
      <option value="In Progress">In Progress</option>
      <option value="Complete">Complete</option>
      <option value="Cancelled">Cancelled</option>
    </select>
  );
}
