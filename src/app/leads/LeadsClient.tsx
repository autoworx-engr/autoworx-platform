"use client";

import { getCompanyInfoForLeadForm } from "@/actions/lead/getCompanyInfoForLeadForm";
import CarLoading from "@/components/common/CarLoading";
import ZapForm from "@/components/ZapForm";
import { errorToast } from "@/lib/toast";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface CompanyInfo {
  name: string;
  image: string;
  website: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  companyId: number;
}

export default function LeadsClient() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get("companyId");

  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      if (!companyId) {
        setError("Missing companyId in URL");
        setLoading(false);
        return;
      }

      try {
        const result = await getCompanyInfoForLeadForm({ companyId });

        setCompany({
          name: result?.name ?? "",
          image: result?.image ?? "",
          website: result?.website ?? "",
          phone: result?.phone ?? "",
          address: result?.address ?? "",
          city: result?.city ?? "",
          state: result?.state ?? "",
          companyId: result?.id ?? +companyId,
        });
      } catch (err) {
        errorToast("Failed to load company info");
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CarLoading />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 text-center shadow-lg">
          <div className="flex justify-center">
            <svg
              className="h-12 w-12 text-red-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.054 0 1.918-.816 1.994-1.851L21 18V6a2 2 0 00-1.851-1.994L19 4H5a2 2 0 00-1.994 1.851L3 6v12a2 2 0 001.851 1.994L5 20z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800">
            Company Not Found
          </h2>
          <p className="text-gray-600">
            The link you followed may be this company invalid, or deleted.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-white transition hover:bg-[#4e5bff] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Go Back Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-y-auto items-center justify-center p-4">
      <ZapForm company={company} />
    </div>
  );
}
