"use client";

import { deleteClient } from "@/actions/client/delete";
import { Popconfirm } from "antd";
import { X } from "lucide-react";

export default function DeleteClient({ id }: { id: number }) {
  return (
    <Popconfirm
      title="Delete the client"
      description="Are you sure to delete this client?"
      okText="Yes"
      cancelText="No"
      onConfirm={() => deleteClient(id)}
    >
      <X cursor={"pointer"} color="#f87171" className="w-6 h-6" />
    </Popconfirm>
  );
}
