"use client";
import React, { useState } from "react";
import Image from "next/image";
import { PricePlans } from "./PricePlans";
import moment from "moment-timezone";
import { useCompanyTimezone } from "@/hooks/useCompanyTimezone";

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
    <div className="min-h-screen">
      <div className="relative -top-10 mx-auto flex max-w-4xl flex-col items-center space-y-2 overflow-hidden p-2 sm:p-4 lg:p-6">
        {/* Subscription Section */}
        <div className="mb-2 mt-10 w-full">
          <h2 className="font-inter mb-2 text-lg font-semibold text-[#66738C] sm:text-xl">
            Subscription
          </h2>
          <div className="flex flex-col gap-4 rounded-[5px] border border-[#D9D9D9] bg-background p-4 sm:p-6 lg:flex-row">
            <div className="flex-1 space-y-2 lg:space-y-4">
              <p className="font-inter text-base font-semibold leading-6 text-[#66738C] sm:text-lg lg:text-xl">
                Subscribed to{" "}
                <span
                  className={`font-semibold italic ${planColors[selectedPlan] || "text-gray-500"}`}
                >
                  {selectedPlan}
                </span>
              </p>
              <p className="font-inter text-base font-normal italic leading-6 text-[#66738C] sm:text-lg lg:text-xl">
                Activated on{" "}
                <span className="font-semibold italic">8th August 2024</span>
              </p>
              <p className="font-inter mb-4 text-base font-normal italic leading-6 text-[#66738C] sm:text-lg lg:text-xl">
                Expires on{" "}
                <span className="font-semibold italic">8th August 2025</span>
              </p>

              <div className="mt-6 flex flex-col space-y-3 sm:flex-row sm:space-x-4 sm:space-y-0 lg:mt-8">
                <button
                  className="font-inter h-10 w-full rounded-[5px] bg-[#66738C] text-base font-normal leading-6 text-white sm:h-11 sm:w-32 sm:text-lg lg:text-xl"
                  onClick={() => setPlansOpen((prev) => !prev)}
                >
                  Re-new
                </button>
                <button
                  className="font-inter h-10 w-full rounded-[5px] bg-[#6571FF] text-base font-bold leading-6 text-white sm:h-11 sm:w-36 sm:text-lg lg:text-xl"
                  onClick={() => setPlansOpen((prev) => !prev)}
                >
                  Upgrade
                </button>
              </div>
              <p className="font-inter mt-4 text-xs font-normal italic leading-4 text-[#66738C] sm:text-sm">
                If you want a package customized according to your preferences,
                contact us here
              </p>
            </div>
            {/* Icon section */}
            <div className="flex justify-center lg:justify-end">
              <Image
                src="/icons/CompanyLogo1.svg"
                width={150}
                height={150}
                alt="Company logo"
                className="sm:h-40 sm:w-40 lg:h-48 lg:w-48"
              />
            </div>
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="mb-4 w-full">
          <h2 className="font-inter mb-4 text-lg font-semibold leading-6 text-[#66738C] sm:text-xl">
            Payment Methods
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:flex lg:space-x-4">
            {/* Payment method cards */}
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex h-24 items-center justify-center rounded-[5px] border border-[#D9D9D9] bg-background sm:h-32 lg:h-32 lg:w-36"
              >
                <p className="font-inter text-2xl font-semibold leading-8 text-[#66738C] sm:text-3xl lg:text-4xl">
                  Logo
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History Section */}
        <div className="mt-4 w-full">
          <h2 className="font-inter mb-4 text-[20px] font-semibold leading-[24px] text-[#66738C]">
            Payment History
          </h2>
          <div className="max-h-64 overflow-x-auto rounded-[5px] border border-[#D9D9D9] bg-background p-4">
            <table className="min-w-full text-left">
              <thead>
                <tr className="font-inter sticky -top-4 bg-background text-[16px] font-bold leading-[19px] text-[#66738C]">
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Payment Method</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="border border-[#D9D9D9]">
                {paymentHistory.map((entry, index) => (
                  <tr
                    key={index}
                    className={
                      index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]"
                    }
                  >
                    <td className="px-6 py-3">{entry.amount}</td>
                    <td className="px-6 py-3">{entry.method}</td>
                    <td className="px-6 py-3">
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
