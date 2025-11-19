"use client";
import React, { useState } from "react";
import Image from "next/image";
import { PricePlans } from "./PricePlans";
import moment from "moment-timezone";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";
import { Award, CreditCard, History, Zap } from "lucide-react";

const paymentHistory = [
  { amount: "$100", method: "Credit Card", date: "2024-08-01" },
  { amount: "$200", method: "PayPal", date: "2024-08-02" },
  { amount: "$150", method: "Bank Transfer", date: "2024-08-03" },
  { amount: "$250", method: "Credit Card", date: "2024-08-04" },
  { amount: "$250", method: "Credit Card", date: "2024-08-04" },
  { amount: "$250", method: "Credit Card", date: "2024-08-04" },
  { amount: "$250", method: "Credit Card", date: "2024-08-04" },
  { amount: "$250", method: "Credit Card", date: "2024-08-04" },
];

const planColors: { [key: string]: string } = {
  "Autoworx Basic Plan": "text-gray-500",
  "Autoworx Standard Plan": "text-[#6571FF]",
  "Autoworx Premium Plan": "text-yellow-500",
};

export default function Page() {
  const [plansOpen, setPlansOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Autoworx Basic Plan");
  const timezone = useCompanyTimezone();

  return (
    <div className="min-h-screen ">
      <div className="relative  flex max-w-4xl flex-col space-y-8 p-2">
        {/* Subscription Section */}
        <div className="w-full">
          <h2 className="mb-4 flex items-center text-2xl font-bold ">
            <Zap className="w-6 h-6 mr-2 text-indigo-600" />
            Subscription Details
          </h2>
          <div className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-xl lg:flex-row">
            <div className="flex-1 space-y-3 lg:space-y-4">
              <p className="text-lg font-semibold leading-7 text-gray-700 sm:text-xl">
                Current Plan:{" "}
                <span
                  className={`text-2xl font-extrabold ${
                    planColors[selectedPlan] || "text-gray-500"
                  }`}
                >
                  {selectedPlan}
                </span>
              </p>
              <div className="space-y-1 text-base font-normal text-gray-600">
                <p>
                  Activated on:{" "}
                  <span className="font-semibold text-gray-800">
                    8th August 2024
                  </span>
                </p>
                <p>
                  Expires on:{" "}
                  <span className="font-semibold text-red-500">
                    8th August 2025
                  </span>
                </p>
              </div>

              <div className="mt-8 flex flex-col space-y-3 sm:flex-row sm:space-x-4 sm:space-y-0 lg:mt-10">
                <button
                  className="h-11 w-full rounded-lg border border-gray-400 bg-gray-50 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-100 transition sm:w-32 lg:w-36"
                  onClick={() => setPlansOpen((prev) => !prev)}
                >
                  Re-new
                </button>
                <button
                  className="h-11 w-full rounded-lg bg-[#6571FF] text-base font-bold text-white shadow-md hover:bg-[#525fec] transition sm:w-36 lg:w-40"
                  onClick={() => setPlansOpen((prev) => !prev)}
                >
                  <Award className="w-5 h-5 inline mr-1" />
                  Upgrade
                </button>
              </div>
              <p className="mt-4 text-xs font-normal italic leading-4 text-gray-500 pt-2">
                If you want a package customized according to your preferences,
                contact us here
              </p>
            </div>
            {/* Icon section */}
            <div className="flex justify-center lg:justify-end lg:items-center">
              <Image
                src="/icons/CompanyLogo1.svg"
                width={150}
                height={150}
                alt="Company logo"
                className="h-32 w-32 sm:h-40 sm:w-40 lg:h-48 lg:w-48 opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="w-full">
          <h2 className="mb-4 flex items-center text-2xl font-bold ">
            <CreditCard className="w-6 h-6 mr-2 text-indigo-600" />
            Payment Methods
          </h2>
          <div className="flex flex-wrap justify-start gap-4">
            {/* Payment method cards */}
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex h-24 w-full items-center justify-center rounded-lg border border-gray-300 bg-white shadow-sm hover:shadow-md transition sm:h-32 sm:w-40"
              >
                <p className="text-xl font-bold text-gray-500 sm:text-2xl">
                  Logo
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History Section */}
        <div className="w-full">
          <h2 className="mb-4 flex items-center text-2xl font-bold ">
            <History className="w-6 h-6 mr-2 text-indigo-600" />
            Payment History
          </h2>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr className="sticky top-0 text-left text-sm font-bold uppercase tracking-wider text-gray-600">
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Payment Method</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-800">
                {paymentHistory.map((entry, index) => (
                  <tr
                    key={index}
                    className={
                      index % 2 === 0
                        ? "bg-white hover:bg-gray-50"
                        : "bg-blue-100 hover:bg-gray-100"
                    }
                  >
                    <td className="px-6 py-3 font-medium">
                      {entry.amount}
                    </td>
                    <td className="px-6 py-3">{entry.method}</td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {entry.date
                        ? moment.tz(entry.date, timezone).format("MM/DD/YYYY")
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {plansOpen && (
        <PricePlans
          setSelectedPlan={setSelectedPlan}
          setClose={() => setPlansOpen(false)}
          currentPlan={selectedPlan}
        />
      )}
    </div>
  );
}
