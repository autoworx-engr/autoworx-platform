"use client";

import { Category, Labor, Service } from "@prisma/client";
import { useState } from "react";
import CannedLabor from "./CannedLabor";
import CannedServices from "./CannedServices";

type Props = {
  labors: (Labor & { category: Category })[];
  services: (Service & { category: Category })[];
};

const CannedMobileTabs = ({ labors, services }: Props) => {
  const [activeTab, setActiveTab] = useState<"labor" | "service">("labor");

  return (
    <div className="lg:hidden">
      <div className="mb-4">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("labor")}
            className={`flex-1 py-3 px-4 font-semibold text-sm transition-all ${
              activeTab === "labor"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Canned Labor
          </button>
          <button
            onClick={() => setActiveTab("service")}
            className={`flex-1 py-3 px-4 font-semibold text-sm transition-all ${
              activeTab === "service"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Canned Services
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1 h-full">
        {activeTab === "labor" ? (
          <CannedLabor labors={labors} />
        ) : (
          <CannedServices services={services} />
        )}
      </div>
    </div>
  );
};

export default CannedMobileTabs;
