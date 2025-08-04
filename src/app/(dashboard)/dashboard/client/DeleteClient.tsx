"use client";

import { FaTimes } from "react-icons/fa";
import { deleteClient } from "@/actions/client/delete";
import { Popconfirm } from "antd";

export default function DeleteClient({ id }: { id: number }) {
  return (
    <Popconfirm
      title="Delete the client"
      description="Are you sure to delete this client?"
      okText="Yes"
      cancelText="No"
      onConfirm={() => deleteClient(id)}
    >
      <FaTimes cursor={"pointer"} color="#f87171" className="text-xl" />
    </Popconfirm>
  );
}
