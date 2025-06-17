"use client";

import { deleteEmployee } from "@/actions/employee/delete";
import { User } from "@prisma/client";
import { Popconfirm } from "antd";
import React from "react";
import { FaTimes } from "react-icons/fa";

export default function DeleteEmployee({ employee }: { employee: User }) {
  return (
    <Popconfirm
      title="Delete the employee"
      description="Are you sure to delete this employee?"
      okText="Yes"
      cancelText="No"
      onConfirm={() => deleteEmployee(employee.id)}
    >
      <FaTimes cursor={"pointer"} color="#f87171" className="text-xl" />
    </Popconfirm>
  );
}
