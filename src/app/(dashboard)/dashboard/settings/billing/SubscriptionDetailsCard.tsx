"use client";

import { PlatformSubscriptionStatus } from "@prisma/client";
import { Zap } from "lucide-react";
import moment from "moment-timezone";
import Image from "next/image";
import { SubscriptionActions } from "./SubscriptionActions";

const planColors: { [key: string]: string } = {
  "Starter (Text Only)": "text-gray-500",
  "Starter (Call + Text)": "text-primary",
  Growth: "text-primary",
  Scale: "text-yellow-500",
};

type SubscriptionDetailsCardProps = {
  companyId: number;
  subscription: any;
  subStatus: PlatformSubscriptionStatus | "NONE";
  currentPlanName: string;
  logoIndex: number;
  onUpgradeClick: () => void;
};

export function SubscriptionDetailsCard({
  companyId,
  subscription,
  subStatus,
  currentPlanName,
  logoIndex,
  onUpgradeClick,
}: SubscriptionDetailsCardProps) {
  return (
    <div className="w-full">
      <h2 className="mb-4 flex items-center text-2xl font-bold ">
        <Zap className="w-6 h-6 mr-2 text-primary" />
        Subscription Details
      </h2>
      <div className="flex flex-col gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-xl lg:flex-row">
        <div className="flex-1 space-y-3 lg:space-y-4">
          <p className="text-lg font-semibold leading-7 text-gray-700 sm:text-xl">
            Current Plan:{" "}
            <span
              className={`text-2xl font-extrabold ${
                planColors[currentPlanName] || "text-gray-500"
              }`}
            >
              {currentPlanName}
            </span>
            {subStatus !== PlatformSubscriptionStatus.ACTIVE &&
              subStatus !== ("NONE" as any) && (
                <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">
                  {subStatus}
                </span>
              )}
            {subscription?.cancelAtPeriodEnd && (
              <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase">
                Ending{" "}
                {subscription.currentPeriodEnd
                  ? moment(subscription.currentPeriodEnd).format("MMM D")
                  : "soon"}
              </span>
            )}
          </p>
          <div className="space-y-1 text-base font-normal text-gray-600">
            {subscription ? (
              <>
                <p>
                  Activated on:{" "}
                  <span className="font-semibold text-gray-800">
                    {moment(subscription.currentPeriodStart).format(
                      "Do MMMM YYYY",
                    )}
                  </span>
                </p>
                <p>
                  Next Billing:{" "}
                  <span
                    className={`font-semibold ${subStatus === PlatformSubscriptionStatus.PAST_DUE ? "text-red-500" : "text-gray-800"}`}
                  >
                    {subscription.currentPeriodEnd
                      ? moment(subscription.currentPeriodEnd).format(
                          "Do MMMM YYYY",
                        )
                      : "N/A"}
                  </span>
                </p>
              </>
            ) : (
              <p>You don't have an active subscription yet.</p>
            )}
          </div>

          <div className="mt-8 lg:mt-10">
            <SubscriptionActions
              companyId={companyId}
              status={subStatus}
              cancelAtPeriodEnd={!!subscription?.cancelAtPeriodEnd}
              onUpgradeClick={onUpgradeClick}
            />
          </div>
          <p className="mt-4 text-xs font-normal italic leading-4 text-gray-500 pt-2">
            If you want a package customized according to your preferences,{" "}
            <br />
            contact us here at <i>admin@autoworx.tech</i>
          </p>
        </div>
        <div className="flex justify-center lg:justify-end lg:items-center">
          <Image
            src={`/icons/CompanyLogo${(Math.max(0, logoIndex) % 3) + 1}.svg`}
            width={150}
            height={150}
            alt="Company logo"
            className="h-32 w-32 sm:h-40 sm:w-40 lg:h-48 lg:w-48 opacity-80"
          />
        </div>
      </div>
    </div>
  );
}
