import UnderConstruction from "@/components/UnderConstruction";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Under Construction",
  description:
    "This page is currently under construction. Please check back soon.",
};

export default function Page() {
  return <UnderConstruction />;
}
