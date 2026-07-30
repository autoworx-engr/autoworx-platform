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
    >
      <X cursor={"pointer"} color="#f87171" className="w-6 h-6" />
    </Popconfirm>
  );
}
