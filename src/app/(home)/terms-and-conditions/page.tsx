import TermsConditions from "./TermsCondition";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Read our terms and conditions governing the use of our services.",
};

export default function Page() {
  return (
    <div>
      <TermsConditions />
    </div>
  );
}
