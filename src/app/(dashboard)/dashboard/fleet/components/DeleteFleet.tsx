"use client";

import { Popconfirm } from "antd";
import { deleteFleet } from "@/actions/fleet/delete";
import { X } from "lucide-react";

export default function DeleteFleet({ id }: { id: number }) {
  return (
    <Popconfirm
      title="Delete the fleet"
      description="Are you sure to delete this fleet?"
      okText="Yes"
      cancelText="No"
      onConfirm={() => deleteFleet(id)}
    >
      <X size={22} strokeWidth={3} cursor={"pointer"} color="#f87171" />
    </Popconfirm>
  );
}
