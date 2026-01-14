"use client";
import React, { useState } from "react";
import Image from "next/image";
import { CheckCircle, X, XCircle } from "lucide-react";

interface PricePlansProps {
  setClose: () => void;
  onPlanSelect: (plan: any) => void;
  currentPlanId: string | null;
  plans: any[];
}
export function PricePlans({
  setClose,
  onPlanSelect,
  currentPlanId,
  plans,
}: PricePlansProps) {
  const getButtonLabel = (plan: any) => {
    return currentPlanId === plan.id ? "Current Plan" : "Choose Plan";
  };
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

          {plans.map((plan, index) => {
            const isCurrent = plan.id === currentPlanId;
            const colorClass = plan.name.includes("Premium") || plan.name.includes("Scale") ? "text-yellow-500" : (plan.name.includes("Standard") || plan.name.includes("Growth") ? "text-[#6571FF]" : "text-gray-500");
            const bgColorClass = plan.name.includes("Premium") || plan.name.includes("Scale") ? "bg-yellow-500" : (plan.name.includes("Standard") || plan.name.includes("Growth") ? "bg-[#6571FF]" : "bg-gray-500");

            return (
              <div
                key={plan.id}
                className={`w-full max-w-sm rounded-xl bg-white p-8 shadow-2xl transition duration-300 ${isCurrent
                  ? "ring-4 ring-offset-4 ring-indigo-500 scale-105"
                  : "hover:shadow-xl"
                  }`}
              >
                <div className="flex flex-col items-center space-y-6">
                  <Image
                    src={`/icons/CompanyLogo${(index % 3) + 1}.svg`}
                    width={150}
                    height={150}
                    alt={`${plan.name} logo`}
                    className="w-32 h-32"
                  />

                  <h2 className={`text-xl font-bold ${colorClass}`}>
                    {plan.name}
                  </h2>

                  <div className="text-center">
                    <span className="text-4xl font-extrabold">${plan.price}</span>
                    <span className="text-gray-500 ml-1">/mo</span>
                  </div>

                  <button
                    type="button"
                    className={`rounded-full px-6 py-2 text-sm font-semibold text-white transition duration-200 ${isCurrent
                      ? "bg-gray-400 cursor-default"
                      : `${bgColorClass} hover:opacity-90 shadow-md`
                      }`}
                    onClick={() => onPlanSelect(plan)}
                    disabled={isCurrent}
                  >
                    {getButtonLabel(plan)}
                  </button>

                  <ul className="w-full space-y-3 pt-4 text-gray-700">
                    {plan.features.map((feature: any, featureIndex: number) => {
                      const isBooleen = feature.type === "BOOLEAN";
                      const hasFeature = isBooleen ? feature.value === "true" : true;

                      return (
                        <li
                          key={feature.id}
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
                            {feature.featureKey.replace(/_/g, ' ')} {!isBooleen && `: ${feature.value}`}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
