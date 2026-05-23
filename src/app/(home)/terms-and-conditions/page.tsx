import TermsConditions from "./TermsCondition";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions - Autoworx",
};

export default function Page() {
  return (
    <div>
      <TermsConditions />
    </div>
  );
}
