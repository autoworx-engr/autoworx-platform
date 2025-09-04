"use client";

import { useState } from "react";
import { getCompany } from "@/actions/settings/getCompany";
import { Company } from "@prisma/client";
import { successToast } from "@/lib/toast";
import { createLeadLink } from "@/actions/lead/createLeadLink";
import { useLeadLinkStore } from "@/stores/useLeadLinkStore";

const SourceForm = ({ companyId }: { companyId: number }) => {
  const { fetchLeadLinks } = useLeadLinkStore();
  const [source, setSource] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const baseUrl = window.location.origin;

  interface GenerateLinkResult {
    success: boolean;
    token?: string;
    error?: string;
  }

  const handleGenerateLink = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setIsGenerating(true);
    setError("");

    try {
      // Fetch the Zapier token from the database
      const compnayInfo: Company | null = await getCompany();
      const result = compnayInfo?.zapierToken || "";

      if (!result) {
        throw new Error("Failed to retrieve authentication token");
      }

      // Generate the link with the fetched token

      const code = Math.random().toString(36).substring(2, 8);
      const encodedSource = encodeURIComponent(source);
      const encodedToken = encodeURIComponent(result);
      const link = `${baseUrl}/leads?source=${encodedSource}&token=${encodedToken}`;
      // Generate mock short URL
      const fakeShortUrl = `${baseUrl}/leadurl/${code}`;
      setGeneratedLink(link);
      setShortUrl(fakeShortUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while generating the link"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      if (!source || !generatedLink || !shortUrl) {
        throw new Error("Source and link must be generated first.");
      }

      const res = await createLeadLink({
        source,
        generatedLink,
        companyId: companyId,
        shortUrl,
        isShow: false,
      });

      if (res.data) {
        navigator.clipboard.writeText(res.data.shortUrl);
        successToast("Link copied to clipboard!");
      } else {
        throw new Error(res.message || "Failed to copy lead link.");
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while copying the lead link"
      );
    }
  };

  const handleSaveGeneratedLink = async () => {
    try {
      if (!source || !generatedLink || !shortUrl) {
        throw new Error("Source and link must be generated first.");
      }

      const res = await createLeadLink({
        source,
        generatedLink,
        companyId: companyId,
        shortUrl,
        isShow: true,
      });

      if (res.type === "success") {
        successToast("Lead link saved successfully!");
        setSource("");

        await fetchLeadLinks(companyId);
      } else {
        throw new Error(res.message || "Failed to save lead link.");
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while saving the lead link"
      );
    }
  };

  return (
    <div className="mx-auto w-full lg:max-w-[700px]">
      <h2 className="mb-4 text-xl font-semibold text-gray-500 sm:text-2xl">
        Lead Capture
      </h2>
      <div className="overflow-hidden rounded-lg border-2 border-[#00b8b0] bg-background shadow-lg">
        <div className="bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-6 py-4">
          <h2 className="text-center text-2xl font-bold text-white">
            Generate Lead Form Link
          </h2>
          <p className="mt-1 text-center text-white text-opacity-90">
            Enter the source to generate a custom lead form link
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleGenerateLink} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="source"
                className="block text-sm font-medium text-gray-700"
              >
                Lead Source
              </label>
              <input
                id="source"
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Website, Referral, Advertisement, etc."
                required
                className="w-full rounded-md border-2 border-gray-300 px-4 py-2 placeholder:text-gray-500 focus:border-[#00b8b0] focus:outline-none focus:ring-2 focus:ring-[#00b8b0]"
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-md bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-[#00b8b0] focus:outline-none focus:ring-2 focus:ring-[#00b8b0] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate Link"}
            </button>
          </form>

          {generatedLink && shortUrl && (
            <div className="mt-6 space-y-3">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="mb-1 text-sm font-medium text-gray-700">
                  Generated Link:
                </p>
                <p className="break-all text-sm text-blue-600">{`${baseUrl}/leadurl/••••••`}</p>
              </div>
              <div className="flex flex-col gap-2 lg:flex-row">
                <button
                  onClick={copyToClipboard}
                  className="w-full rounded-md bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-[#00b8b0] focus:outline-none focus:ring-2 focus:ring-[#00b8b0] focus:ring-offset-2"
                >
                  Copy Link
                </button>
                <button
                  onClick={handleSaveGeneratedLink}
                  className="w-full rounded-md bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-[#00b8b0] focus:outline-none focus:ring-2 focus:ring-[#00b8b0] focus:ring-offset-2"
                >
                  Save Link
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 text-center text-sm text-gray-600">
          This link will automatically include your company authentication
          token.
        </div>
      </div>
    </div>
  );
};

export default SourceForm;
