"use client";

import { useState } from "react";
import { getCompany } from "@/actions/settings/getCompany";
import { Company } from "@prisma/client";
import { successToast } from "@/lib/toast";
import { createLeadLink } from "@/actions/lead/createLeadLink";
import { useLeadLinkStore } from "@/stores/useLeadLinkStore";
import { AlertTriangle, Clipboard, CornerRightDown, Link, Save } from "lucide-react";

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
      <h2 className="mb-4 flex items-center text-2xl font-bold ">
        <Link className="h-6 w-6 mr-2 text-[#00b8b0]" />
        Lead Capture Link Generator
      </h2>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-6 py-5">
          <h2 className="flex items-center justify-center text-2xl font-extrabold text-white">
            <CornerRightDown className="h-6 w-6 mr-2" />
            Generate Lead Form Link
          </h2>
          <p className="mt-1 text-center text-sm text-white text-opacity-90">
            Enter the **source** to generate a custom lead form link
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleGenerateLink} className="space-y-6">
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
                className="w-full rounded-lg border border-gray-300 px-4 py-3 placeholder:text-gray-400 focus:border-[#00b8b0] focus:ring-1 focus:ring-[#00b8b0] transition duration-150"
              />
            </div>

            {error && (
              <div className="flex items-center rounded-lg border border-red-300 bg-red-50 p-3 text-red-700 font-medium">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-4 py-3 text-lg font-bold text-white transition-all duration-200 hover:opacity-90 shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#00b8b0]/50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate Link"}
            </button>
          </form>

          {generatedLink && shortUrl && (
            <div className="mt-8 space-y-4">
              <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4">
                <p className="mb-1 text-sm font-semibold text-gray-700 flex items-center">
                  <Link className="h-4 w-4 mr-1 text-gray-500" />
                  Short URL:
                </p>
                <p className="break-all text-base font-mono text-blue-600">
                  {`${baseUrl}/leadurl/••••••`}
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row">
                <button
                  onClick={copyToClipboard}
                  className="w-full flex items-center justify-center rounded-lg bg-[#00b8b0] px-4 py-3 text-base font-semibold text-white transition-all duration-200 hover:bg-[#0098da] shadow-sm hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#00b8b0]/50"
                >
                  <Clipboard className="h-5 w-5 mr-2" />
                  Copy Link
                </button>
                <button
                  onClick={handleSaveGeneratedLink}
                  className="w-full flex items-center justify-center rounded-lg bg-[#0098da] px-4 py-3 text-base font-semibold text-white transition-all duration-200 hover:bg-[#00b8b0] shadow-sm hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#0098da]/50"
                >
                  <Save className="h-5 w-5 mr-2" />
                  Save Link
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 text-center text-xs text-gray-600 font-medium italic">
          ⚠️ This link will automatically include your company authentication
          token.
        </div>
      </div>
    </div>
  );
};

export default SourceForm;
