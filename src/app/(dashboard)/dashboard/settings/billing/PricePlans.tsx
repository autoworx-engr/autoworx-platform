"use client";
import React, { useState } from "react";
import Image from "next/image";
import { CheckCircle, X, XCircle } from "lucide-react";

interface PricePlansProps {
  setClose: () => void;
  setSelectedPlan: (planName: string) => void;
  currentPlan: string | null;
}
export function PricePlans({
  setClose,
  setSelectedPlan,
  currentPlan,
}: PricePlansProps) {
  const handlePlanSelect = (planName: string) => {
    setSelectedPlan(planName);

    setClose();
  };

  const getButtonLabel = (planName: string) => {
    return currentPlan === planName ? "Current Plan" : "Choose Plan";
  };

  const planDetails = [
    {
      name: "Autoworx Basic Plan",
      color: "text-gray-500",
      bgColor: "bg-gray-500",
      image: "/icons/CompanyLogo1.svg",
      features: [true, true, true, false, false, false],
    },
    {
      name: "Autoworx Standard Plan",
      color: "text-[#6571FF]",
      bgColor: "bg-[#6571FF]",
      image: "/icons/CompanyLogo2.svg",
      features: [true, true, true, true, false, false],
    },
    {
      name: "Autoworx Premium Plan",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500",
      image: "/icons/CompanyLogo3.svg",
      features: [true, true, true, true, true, true],
    },
  ];
  return (
   <section
      className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/60 backdrop-blur-sm py-20"
      onClick={setClose}
    >
      <div className="relative mx-auto px-4">
        <div
          className="flex w-full max-w-[1200px] flex-col items-center justify-center space-y-6 md:flex-row md:space-x-6 md:space-y-0 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button for Modal */}
          <button
            onClick={setClose}
            className="absolute top-0 right-0 m-4 text-white hover:text-gray-300 transition z-50 md:top-auto md:right-[-40px]"
            aria-label="Close"
          >
            <X className="w-8 h-8" />
          </button>

          {planDetails.map((plan, index) => (
            <div
              key={index}
              className={`w-full max-w-sm rounded-xl bg-white p-8 shadow-2xl transition duration-300 ${
                plan.name === currentPlan
                  ? "ring-4 ring-offset-4 ring-indigo-500 scale-105"
                  : "hover:shadow-xl"
              }`}
            >
              <div className="flex flex-col items-center space-y-6">
                <Image
                  src={plan.image}
                  width={150}
                  height={150}
                  alt={`${plan.name} logo`}
                  className="w-32 h-32"
                />

                <h2 className={`text-xl font-bold ${plan.color}`}>
                  {plan.name}
                </h2>

                <button
                  type="button"
                  className={`rounded-full px-6 py-2 text-sm font-semibold text-white transition duration-200 ${
                    plan.name === currentPlan
                      ? "bg-gray-400 cursor-default"
                      : `${plan.bgColor} hover:opacity-90 shadow-md`
                  }`}
                  onClick={() => handlePlanSelect(plan.name)}
                  disabled={plan.name === currentPlan}
                >
                  {getButtonLabel(plan.name)}
                </button>

                <ul className="w-full space-y-3 pt-4 text-gray-700">
                  {plan.features.map((hasFeature, featureIndex) => (
                    <li
                      key={featureIndex}
                      className="flex items-center text-base"
                    >
                      {hasFeature ? (
                        <CheckCircle className="w-5 h-5 mr-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 mr-3 text-red-400 flex-shrink-0" />
                      )}
                      <span
                        className={
                          hasFeature ? "font-medium" : "text-gray-400 italic"
                        }
                      >
                        Feature {featureIndex + 1}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
