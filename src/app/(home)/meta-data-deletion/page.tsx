import React from "react";
import MetaDataDeletion from "./MetaDataDeletion";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meta Data Deletion",
};

export default function Page() {
  return (
    <div>
      <MetaDataDeletion />
    </div>
  );
}
