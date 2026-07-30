import React from "react";
import WorkOrders from "../../components/WorkOrders";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team Work Orders",
  description: "View and manage your team work orders",
};

export default function page() {
  return <WorkOrders />;
}
