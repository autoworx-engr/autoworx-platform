import React from "react";
import Title from "@/components/Title";
import WorkOrders from "../../components/WorkOrders";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Work Orders",
  description: "View and manage your work orders",
};

export default function page() {
  return (
    <div className="h-full w-full space-y-4 px-2">
      <Title>Work Orders</Title>
      <WorkOrders />
    </div>
  );
}
