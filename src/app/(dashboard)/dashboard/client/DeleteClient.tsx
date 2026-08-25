"use client";

import { deleteClient } from "@/actions/client/delete";
import { errorToast, successToast } from "@/lib/toast";
import { useClientFilterStore } from "@/stores/clientFilter";
import { useQueryClient } from "@tanstack/react-query";
import { Popconfirm } from "antd";
import { X } from "lucide-react";
import { CLIENT_LIST_KEY } from "./_hook/useClientQuery";

export default function DeleteClient({ id }: { id: number }) {
  const { search, pageSize, currentPage } = useClientFilterStore();
  const queryClient = useQueryClient();
  const handleDeleteClient = async () => {
    const response = await deleteClient(id);
    if (response.type === "success") {
      successToast("Client deleted successfully.");
      queryClient.invalidateQueries({
        queryKey: [CLIENT_LIST_KEY, search, currentPage, pageSize],
      });
    } else if (response.type === "error") {
      errorToast(response.message || "Failed to delete client.");
    }
  };
  return (
    <Popconfirm
      title="Delete the client"
      description="Are you sure to delete this client?"
      okText="Yes"
      cancelText="No"
      placement="topLeft"
      onConfirm={handleDeleteClient}
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
      <X cursor={"pointer"} color="#f87171" className="w-6 h-6" />
    </Popconfirm>
  );
}
