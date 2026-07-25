"use client";

import { Popconfirm } from "antd";
import { deleteFleet } from "@/actions/fleet/delete";
import { X } from "lucide-react";
import toast from "react-hot-toast";

export default function DeleteFleet({ id }: { id: number }) {
  const handleDelete = async () => {
    const toastId = `delete-fleet-${id}`;
    try {
      const res = await deleteFleet(id);
      if (res?.type === "success") {
        toast.success("Fleet deleted successfully", { id: toastId });
      } else {
        toast.error("Failed to delete fleet", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete fleet", { id: toastId });
    }
  };

  return (
    <Popconfirm
      title="Delete the fleet"
      description="Are you sure to delete this fleet?"
      okText="Yes"
      cancelText="No"
      placement="topLeft"
      onConfirm={handleDelete}
    >
      <X size={22} strokeWidth={3} cursor={"pointer"} color="#f87171" />
    </Popconfirm>
  );
}
