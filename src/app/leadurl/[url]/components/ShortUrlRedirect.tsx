"use client";

import CarLoading from "@/components/common/CarLoading";
import { useLeadLinkStore } from "@/stores/useLeadLinkStore";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const ShortUrlRedirect = () => {
  const params = useParams();
  const url = params?.url as string;

  const { leadLink, fetchSingleLeadLink } = useLeadLinkStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url || !fetchSingleLeadLink) return;

    const baseUrl = window.location.origin;
    const shortUrlKey = `${baseUrl}/leadurl/${url}`;

    const fetch = async () => {
      try {
        await fetchSingleLeadLink(shortUrlKey);
      } catch (err) {
        setError("Failed to fetch link.");
        console.error("Error fetching lead link:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetch();
  }, [url, fetchSingleLeadLink]);

  // Handle redirect
  useEffect(() => {
    if (leadLink && leadLink.generatedLink) {
      window.location.href = `${leadLink.generatedLink}&companyId=${leadLink.companyId}`;
    }
  }, [leadLink]);

  // UI
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CarLoading />
      </div>
    );
  }

  if (error || !leadLink) {
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
            Lead URL Not Found
          </h2>
          <p className="text-gray-600">
            The link you followed may be invalid, or deleted.
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
    <div className="flex min-h-screen items-center justify-center">
      <CarLoading />
    </div>
  );
};

export default ShortUrlRedirect;
