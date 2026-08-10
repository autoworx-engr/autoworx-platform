"use client";
import { useEffect, useState } from "react";
import { useLeadLinkStore } from "@/stores/useLeadLinkStore";
import { deleteLeadLink } from "@/actions/lead/deleteLeadLink";
import Image from "next/image";
import { successToast } from "@/lib/toast";
import { Skeleton } from "@mui/material";
import { Popconfirm } from "antd";
import moment from "moment";
import {
  ClipboardCheck,
  Clock,
  Copy,
  Download,
  Link,
  QrCode,
  Trash2,
  X,
} from "lucide-react";

type LeadFormEntry = {
  id: number;
  source: string;
  generatedLink: string;
  shortUrl?: string;
  QRCode?: string;
  showQR: boolean;
  createdAt: string;
};

const CannedLeadForm = ({ companyId }: { companyId: number }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { leadLinks, fetchLeadLinks } = useLeadLinkStore();
  const [entries, setEntries] = useState<LeadFormEntry[]>([]);
  const [copiedLink, setCopiedLink] = useState<number | null>(null);
  useEffect(() => {
    if (!companyId) return;
    const fetch = async () => {
      setIsLoading(true);
      try {
        await fetchLeadLinks(companyId);
      } catch (error) {
        console.error("Error fetching lead links:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [companyId, fetchLeadLinks]);

  useEffect(() => {
    const data = leadLinks.map((link: any) => ({
      id: link.id,
      source: link.source,
      generatedLink: link.generatedLink,
      shortUrl: link.shortUrl,
      QRCode: link.QRCode,
      showQR: false,
      createdAt: link.createdAt,
    }));
    setEntries(data);
  }, [leadLinks]);

  const handleToggleQR = async (id: number) => {
    setEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry.id === id
          ? { ...entry, showQR: !entry.showQR }
          : { ...entry, showQR: false },
      ),
    );
  };

  const groupedEntries = entries.reduce(
    (acc: Record<string, LeadFormEntry[]>, entry) => {
      if (!acc[entry.source]) {
        acc[entry.source] = [];
      }
      acc[entry.source].push(entry);
      return acc;
    },
    {},
  );

  const handleDeleteLink = async (id: number) => {
    try {
      await deleteLeadLink(id);
      // Optionally, you can refetch the lead links after deletion
      await fetchLeadLinks(companyId);
      setEntries((prevEntries) =>
        prevEntries.filter((entry) => entry.id !== id),
      );
    } catch (error) {
      console.error("Error deleting lead link:", error);
    }
  };

  const handleCopyLink = (entry: LeadFormEntry) => {
    navigator.clipboard.writeText(entry.shortUrl || entry.generatedLink);
    successToast("Copied to clipboard!");
    setCopiedLink(entry.id);
    setTimeout(() => setCopiedLink(null), 1000);
  };
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h2 className="mb-4 flex items-center text-2xl font-bold ">
        <Clock className="h-6 w-6 mr-2 text-gray-600" />
        Saved Lead Links History
      </h2>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-gray-200 p-4 sm:p-5 bg-gray-50"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <Skeleton width={250} height={24} />
                    <div className="flex space-x-2 self-end sm:self-auto">
                      <Skeleton
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                      <Skeleton
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                      <Skeleton
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <X className="mb-4 h-16 w-16 text-red-400" />
              <h3 className="mb-2 text-xl font-bold text-gray-700">
                No Lead Links Found
              </h3>
              <p className="max-w-md text-sm text-gray-500">
                It looks empty here. Generate and save your first lead link on
                the left side to get started!
              </p>
            </div>
          ) : (
            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-2">
              {Object.keys(groupedEntries).map((source) => (
                <div key={source} className="space-y-3">
                  {groupedEntries[source].map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-xl border-2 ${
                        entry.showQR
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white"
                      } transition-all duration-300 hover:shadow-lg`}
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div
                            className="max-w-full truncate text-base font-semibold capitalize text-gray-700 sm:max-w-xs md:max-w-md flex items-center"
                            title={source}
                          >
                            <Link className="h-5 w-5 mr-2 text-[#00b8b0] flex-shrink-0" />
                            {source} Ad -{" "}
                            <span className="ml-1 text-sm font-normal text-gray-500">
                              {moment(entry.createdAt).format("MMM DD, YYYY")}
                            </span>
                          </div>

                          <div className="flex space-x-2 self-end sm:self-auto">
                            {/* Copy Button */}
                            <button
                              className={`rounded-full p-2 transition-colors duration-200 focus:outline-none focus:ring-2 ${
                                copiedLink === entry.id
                                  ? "bg-green-100 text-green-600 focus:ring-green-400"
                                  : "hover:bg-gray-100 text-gray-800 focus:ring-blue-400"
                              }`}
                              onClick={() => handleCopyLink(entry)}
                              aria-label="Copy link"
                              title="Copy link"
                            >
                              {copiedLink === entry.id ? (
                                <ClipboardCheck className="h-6 w-6" />
                              ) : (
                                <Copy className="h-6 w-6" />
                              )}
                            </button>
                            {/* QR Code Button */}
                            <button
                              className={`rounded-full p-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                entry.showQR
                                  ? "bg-blue-200 text-blue-700"
                                  : "hover:bg-gray-100 text-gray-800"
                              }`}
                              onClick={() => handleToggleQR(entry.id)}
                              aria-label="Show QR code"
                              title="Show QR code"
                            >
                              <QrCode className={`h-6 w-6`} />
                            </button>
                            {/* Delete Button */}
                            <Popconfirm
                              title="Delete lead link"
                              description="Are you sure you want to delete this link?"
                              okText="Yes"
                              cancelText="No"
                              onConfirm={() => handleDeleteLink(entry.id)}
                            >
                              <button
                                className="rounded-full p-2 transition-colors duration-200 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400 text-red-600"
                                aria-label="Delete link"
                                title="Delete link"
                              >
                                <Trash2 className="h-6 w-6" />
                              </button>
                            </Popconfirm>
                          </div>
                        </div>

                        {entry.showQR && (
                          <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col items-center gap-4 sm:flex-row sm:justify-end">
                            <button
                              onClick={async () => {
                                try {
                                  // Try to copy image to clipboard (Chrome/Edge)
                                  const response = await fetch(entry.QRCode!);
                                  const blob = await response.blob();
                                  await navigator.clipboard.write([
                                    new window.ClipboardItem({
                                      [blob.type]: blob,
                                    }),
                                  ]);
                                  successToast("QR code image copied!");
                                } catch (err) {
                                  // Fallback for Firefox/Safari: copy URL as text
                                  await navigator.clipboard.writeText(
                                    entry.QRCode!,
                                  );
                                  successToast("QR code image copied as link");
                                }
                              }}
                              className="order-2 w-full sm:w-auto flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:order-1"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Copy QR Code
                            </button>
                            <div className="order-1 rounded-xl border border-gray-200 bg-white p-3 shadow-md sm:order-2">
                              <Image
                                src={entry.QRCode!}
                                alt="QR code"
                                width={120}
                                height={120}
                                className="h-32 w-32 sm:h-36 sm:w-36"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CannedLeadForm;
