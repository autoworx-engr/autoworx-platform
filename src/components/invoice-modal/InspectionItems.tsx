"use client";

import { getInspections } from "@/actions/estimate/invoice/getInspections";
import { InvoiceInspection } from "@prisma/client";
import { ChevronDown, ChevronUp } from "lucide-react";
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
          (r) => r.title && r.title.trim() !== "" && (r.driver || r.passenger)
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
    <div className={`w-full space-y-4 rounded-lg ${className}`}>
      {/* Header with toggle */}
      <div
        className="flex cursor-pointer items-center justify-between rounded-md bg-gray-50 p-3 hover:bg-gray-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-medium md:text-base">
          Vehicle Inspection Details
        </h3>
        <span>{isExpanded ? <ChevronUp /> : <ChevronDown />}</span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="space-y-4 px-1">
          {/* Inspection table */}
          <div className="rounded-md border border-gray-200">
            <div className="grid grid-cols-10 gap-1 bg-[#E0E3FF] p-2 text-xs font-medium md:text-sm">
              <div className="col-span-5">Parts</div>
              <div className="col-span-2 text-center">Driver</div>
              <div className="col-span-3 text-center">Passenger</div>
            </div>

            <div className="thin-scrollbar max-h-64 overflow-y-auto">
              {inspectionData.map((item, index) => (
                <div
                  key={index}
                  className="border-b border-gray-100 last:border-b-0"
                >
                  <div
                    className={`grid cursor-pointer grid-cols-10 gap-1 p-2 text-xs md:text-sm ${index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]"}`}
                    onClick={() => toggleItemExpansion(index)}
                  >
                    <div className="col-span-5 flex items-center">
                      <span className="truncate font-medium">{item.title}</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-center">
                      {item.driver ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6571FF] text-white">
                          ✓
                        </span>
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200">
                          -
                        </span>
                      )}
                    </div>
                    <div className="col-span-3 flex items-center justify-center">
                      {item.passenger ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6571FF] text-white">
                          ✓
                        </span>
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200">
                          -
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Notes section for each part when expanded */}
                  {expandedItem === index && item.notes && (
                    <div
                      className={`border-t border-gray-100 p-2 text-xs ${index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]"}`}
                    >
                      <div className="flex gap-2">
                        <span className="font-medium text-gray-700">
                          Notes:
                        </span>
                        <span className="text-gray-600">
                          {item.notes || "No notes available"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Overall damage notes section */}
          {damageNotes && (
            <div className="space-y-2 rounded-md border border-gray-200 p-3">
              <h4 className="font-medium text-gray-700">Damage Notes:</h4>
              <p className="text-xs text-gray-600 md:text-sm">{damageNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
