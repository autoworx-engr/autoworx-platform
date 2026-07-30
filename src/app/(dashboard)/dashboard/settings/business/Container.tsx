import React from "react";
import BusinessForm from "./BusinessForm";
import { getCompany } from "@/actions/settings/getCompany";
import { getCompanyId } from "@/lib/companyId";
import GoogleReviewSettings from "@/components/GoogleReviewSettings";
import BookingGenerate from "@/components/BookingGenerate";
import { TermsAndPolicyEditor } from "@/components/TermsAndPolicyEditor";

export default async function Container() {
  const company = await getCompany();
  const companyId = await getCompanyId();

  return (
    <div className="bg-white px-2">
      <BusinessForm company={JSON.parse(JSON.stringify(company))} />

      <div className="mt-10 border-t border-slate-200/70 pt-8">
        <h3 className="mb-4 text-2xl font-bold text-gray-800 border-b pb-2">
          Business Preferences
        </h3>
        <div className="space-y-6">
          <GoogleReviewSettings initialReviewLink={company?.googleReviewLink} />
          <BookingGenerate companyId={companyId.toString()} />
          <TermsAndPolicyEditor />
        </div>
      </div>
    </div>
  );
}
