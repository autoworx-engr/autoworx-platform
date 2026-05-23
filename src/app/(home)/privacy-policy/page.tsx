import React from "react";
import PrivacyPolicy from "./PrivacyPolicy";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Autoworx",
};

export default function Page() {
  return (
    <div>
      <PrivacyPolicy />
    </div>
  );
}
