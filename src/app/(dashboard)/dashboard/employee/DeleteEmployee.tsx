"use client";

import { deleteEmployee } from "@/actions/employee/delete";
import { errorToast, successToast } from "@/lib/toast";
import { useEmployeeFilterStore } from "@/stores/employeeFilter";
import { User } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { Popconfirm } from "antd";
import { X } from "lucide-react";
import { EMPLOYEE_LIST_KEY } from "./_hook/useEmployeeQuery";

export default function DeleteEmployee({ employee }: { employee: User }) {
  const { dateRange, search, type, currentPage, pageSize } =
    useEmployeeFilterStore();
  const queryClient = useQueryClient();
  const handleEmployeeDelete = async (employeeId: number) => {
    try {
      const deleted = await deleteEmployee(employeeId);
      if (deleted.type === "success") {
        queryClient.invalidateQueries({
          queryKey: [
            EMPLOYEE_LIST_KEY,
            currentPage,
            pageSize,
            type,
            search,
            dateRange[0],
            dateRange[1],
          ],
        });
        successToast("Employee deleted successfully");
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      errorToast("Failed to delete employee. Please try again.");
    }
  };
  return (
    <Popconfirm
      title="Delete the employee"
      description="Are you sure to delete this employee?"
      okText="Yes"
      cancelText="No"
      placement="topLeft"
      onConfirm={() => {
        handleEmployeeDelete(employee?.id);
      }}
      overlayClassName="[&_.ant-popover-inner]:rounded-2xl [&_.ant-popover-inner]:p-4 [&_.ant-popover-message-title]:font-semibold [&_.ant-popover-message-title]:text-slate-800"
      okButtonProps={{
        className:
          "!rounded-lg !border-none !bg-[#6571ff] !font-semibold !shadow-sm !shadow-[#6571ff]/30 hover:!bg-[#525ceb]",
      }}
      cancelButtonProps={{
        className:
          "!rounded-lg !border-slate-200 !font-medium !text-slate-600 hover:!border-slate-300 hover:!bg-slate-50 hover:!text-slate-700",
      }}
    >
      <X cursor={"pointer"} color="#f87171" className="text-xl mt-1" />
    </Popconfirm>
  );
}
