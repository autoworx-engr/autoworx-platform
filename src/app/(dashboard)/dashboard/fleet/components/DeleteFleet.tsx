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
      <X size={22} strokeWidth={3} cursor={"pointer"} color="#f87171" />
    </Popconfirm>
  );
}
