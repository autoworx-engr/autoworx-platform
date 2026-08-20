"use client";

import { getInspections } from "@/actions/estimate/invoice/getInspections";
import { cn } from "@/lib/cn";
import { InvoiceInspection } from "@prisma/client";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

interface InspectionItemsProps {
  damageNotes?: string;
  className?: string;
  invoiceId: string;
}

export function InspectionItems({
  damageNotes,
  invoiceId,
  className = "",
}: InspectionItemsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [inspectionData, setInspectionData] = useState<InvoiceInspection[]>([]);
  useEffect(() => {
    // Fetch inspection data and damage notes from the backend
    const fetchInspectionData = async () => {
      try {
        const response = await getInspections(invoiceId);
        console.log("inspection response", response);
        const filtered = response.filter(
          (r) => r.title && r.title.trim() !== "" && (r.driver || r.passenger),
        );
        setInspectionData(filtered);
      } catch (error) {
        console.error("Error fetching inspection data:", error);
      }
    };

    fetchInspectionData();
  }, [invoiceId]);
  console.log("inspectionsss", inspectionData);
  const toggleItemExpansion = (index: number) => {
    setExpandedItem(expandedItem === index ? null : index);
  };

  return (
    <div className={`w-full space-y-4 rounded-3xl ${className}`}>
      {/* Header with toggle - Modern Minimalist Style */}
      <div
        className="group flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50/80 p-4 transition-all hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 md:text-sm">
            Vehicle Inspection Details
          </h3>
        </div>
        <span className="text-slate-400 group-hover:text-primary">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="space-y-6 px-1 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Inspection table */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid grid-cols-10 gap-1 bg-slate-50 p-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:bg-slate-800/50">
              <div className="col-span-5">Parts</div>
              <div className="col-span-2 text-center">Driver</div>
              <div className="col-span-3 text-center">Passenger</div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {inspectionData.map((item, index) => (
                <div
                  key={index}
                  className="group border-b border-slate-50 last:border-b-0 dark:border-slate-800/50"
                >
                  <div
                    className={`grid cursor-pointer grid-cols-10 gap-1 p-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${
                      index % 2 === 0
                        ? "bg-white dark:bg-slate-900"
                        : "bg-[#FBFBFF] dark:bg-slate-800/10"
                    }`}
                    onClick={() => toggleItemExpansion(index)}
                  >
                    <div className="col-span-5 flex items-center">
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {item.title}
                      </span>
                    </div>

                    {/* Checkmark Columns */}
                    {[item.driver, item.passenger].map((val, i) => (
                      <div
                        key={i}
                        className={`${i === 0 ? "col-span-2" : "col-span-3"} flex items-center justify-center`}
                      >
                        <div
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-lg border-2 transition-all duration-200",
                            "border-slate-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700",
                            val &&
                              "border-primary bg-primary shadow-md shadow-primary/20",
                          )}
                        >
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="white"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={cn(
                              "h-2.5 w-2.5 transition-all duration-200 mb-0.5",
                              val
                                ? "scale-100 opacity-100"
                                : "scale-50 opacity-0",
                            )}
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Notes section with a "Bubble" look */}
                  {expandedItem === index && item.notes && (
                    <div className="bg-slate-50/30 px-4 pb-4 dark:bg-slate-800/20">
                      <div className="rounded-xl border border-slate-100 bg-white p-3 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <p className="font-bold text-primary uppercase text-[9px] mb-1 tracking-tighter">
                          Technician Notes
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                          {item.notes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Overall damage notes section */}
          {damageNotes && (
            <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 dark:border-slate-700 dark:bg-slate-800/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-slate-400" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Damage Assessment
                </h4>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {damageNotes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
