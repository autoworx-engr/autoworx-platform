"use client";

import { FaTimes } from "react-icons/fa";
import { Popconfirm } from "antd";
import { deleteFleet } from "@/actions/fleet/delete";

export default function DeleteFleet({ id }: { id: number }) {
  return (
    <Popconfirm
      title="Delete the fleet"
      description="Are you sure to delete this fleet?"
      okText="Yes"
      cancelText="No"
      onConfirm={() => deleteFleet(id)}
    >
      <FaTimes cursor={"pointer"} color="#f87171" className="text-xl" />
    </Popconfirm>
  );
}
