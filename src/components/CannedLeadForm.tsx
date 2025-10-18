"use client";
import { useEffect, useState } from "react";
import { useLeadLinkStore } from "@/stores/useLeadLinkStore";
import { deleteLeadLink } from "@/actions/lead/deleteLeadLink";
import Image from "next/image";
import { successToast } from "@/lib/toast";
import { Skeleton } from "@mui/material";
import moment from "moment";
import { Copy, QrCode, Trash2, X } from "lucide-react";

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

  useEffect(() => {
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
  }, []);

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
          : { ...entry, showQR: false }
      )
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
    {}
  );

  const handleDeleteLink = async (id: number) => {
    try {
      await deleteLeadLink(id);
      // Optionally, you can refetch the lead links after deletion
      await fetchLeadLinks(companyId);
      setEntries((prevEntries) =>
        prevEntries.filter((entry) => entry.id !== id)
      );
    } catch (error) {
      console.error("Error deleting lead link:", error);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8">
      <h2 className="mb-4 text-xl font-semibold text-gray-500 sm:text-2xl">
        Canned Lead Form
      </h2>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-gray-200 p-3 sm:p-4"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <Skeleton width={200} height={20} />
                    <div className="flex space-x-2 self-end sm:self-auto">
                      <Skeleton
                        width={36}
                        height={36}
                        className="rounded-full"
                      />
                      <Skeleton
                        width={36}
                        height={36}
                        className="rounded-full"
                      />
                      <Skeleton
                        width={36}
                        height={36}
                        className="rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <X className="mb-4 h-16 w-16 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-700">
                No Lead Links Found
              </h3>
              <p className="max-w-md text-sm text-gray-500">
                It looks empty here. Generate your first lead link to get
                started!
              </p>
            </div>
          ) : (
            <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
              {Object.keys(groupedEntries).map((source) => (
                <div key={source} className="space-y-3">
                  <div className="space-y-2">
                    {groupedEntries[source].map((entry) => (
                      <div
                        key={entry.id}
                        className={`rounded-lg border ${
                          entry.showQR ? "border-blue-400" : "border-gray-200"
                        } transition-all duration-200 hover:shadow-md`}
                      >
                        <div className="p-2 sm:p-3">
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div
                              className="max-w-full truncate text-sm font-medium capitalize text-gray-500 sm:max-w-xs sm:text-base md:max-w-sm"
                              title={source}
                            >
                              {source} Ad -{" "}
                              {moment(entry.createdAt).format("DD.MM.YY")}
                            </div>

                            <div className="flex space-x-1 self-end sm:space-x-2 sm:self-auto">
                              <button
                                className="rounded-full p-2 transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    entry.shortUrl || entry.generatedLink
                                  );
                                  successToast("Copied to clipboard!");
                                }}
                                aria-label="Copy link"
                                title="Copy link"
                              >
                                <Copy className="h-5 w-5 text-gray-800" />
                              </button>
                              <button
                                className={`rounded-full p-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                  entry.showQR
                                    ? "bg-blue-50"
                                    : "hover:bg-gray-100"
                                }`}
                                onClick={() => handleToggleQR(entry.id)}
                                aria-label="Show QR code"
                                title="Show QR code"
                              >
                                <QrCode
                                  className={`h-5 w-5 ${entry.showQR ? "text-blue-500" : "text-gray-800"}`}
                                />
                              </button>
                              <button
                                className="rounded-full p-2 transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                                onClick={() => handleDeleteLink(entry.id)}
                                aria-label="Delete link"
                                title="Delete link"
                              >
                                <Trash2 className="h-5 w-5 text-red-500" />
                              </button>
                            </div>
                          </div>

                          {entry.showQR && (
                            <div className="mt-4 flex flex-col items-end justify-center gap-4 sm:flex-row sm:justify-end">
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
                                      entry.QRCode!
                                    );
                                    successToast(
                                      "QR code image copied as link"
                                    );
                                  }
                                }}
                                className="order-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 sm:order-1"
                              >
                                Copy QR Code
                              </button>
                              <div className="order-1 rounded-lg border border-gray-100 bg-white p-2 shadow-sm sm:order-2">
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
