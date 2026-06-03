import React from "react";
import PrivacyPolicy from "./PrivacyPolicy";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read our privacy policy to understand how we collect, use, and protect your data.",
};

export default function Page() {
  return (
    <div>
      <PrivacyPolicy />
    </div>
  );
}
