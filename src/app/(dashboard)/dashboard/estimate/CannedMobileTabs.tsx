"use client";

import { Category, Labor, Service } from "@prisma/client";
import { useState } from "react";
import CannedLabor from "./CannedLabor";
import CannedServices from "./CannedServices";

type Props = {
  labors: (Labor & { category: Category })[];
  laborTotal: number;
  laborPage: number;
  laborTake: number;
  services: (Service & { category: Category })[];
  serviceTotal: number;
  servicePage: number;
  serviceTake: number;
  categories: Category[];
};

const CannedMobileTabs = ({
  labors,
  laborTotal,
  laborPage,
  laborTake,
  services,
  serviceTotal,
  servicePage,
  serviceTake,
  categories,
}: Props) => {
  const [activeTab, setActiveTab] = useState<"labor" | "service">("labor");

  return (
    <div className="min-w-0 lg:hidden">
      <div className="mb-4">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("labor")}
            className={`flex-1 whitespace-nowrap px-2 py-3 text-sm font-semibold transition-all sm:px-4 ${
              activeTab === "labor"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Canned Labor
          </button>
          <button
            onClick={() => setActiveTab("service")}
            className={`flex-1 whitespace-nowrap px-2 py-3 text-sm font-semibold transition-all sm:px-4 ${
              activeTab === "service"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Canned Services
          </button>
        </div>
      </div>

      <div className="flex h-full min-w-0 flex-1 flex-col">
        {activeTab === "labor" ? (
          <CannedLabor
            labors={labors}
            total={laborTotal}
            page={laborPage}
            take={laborTake}
            categories={categories}
          />
        ) : (
          <CannedServices
            services={services}
            total={serviceTotal}
            page={servicePage}
            take={serviceTake}
            categories={categories}
          />
        )}
      </div>
    </div>
  );
};

export default CannedMobileTabs;
