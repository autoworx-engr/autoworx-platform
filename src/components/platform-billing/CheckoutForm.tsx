"use client";

import { subscribeToPlatformPlan } from "@/actions/platform-billing/subscribe";
import {
  Calendar,
  CreditCard,
  Hash,
  Loader2,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react";
import Script from "next/script";
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { BillingAddressFields } from "./BillingAddressFields";

type CheckoutPlan = {
  id: string;
  name: string;
  price: number;
  interval?: "MONTHLY" | "YEARLY";
};

interface CheckoutFormProps {
  plan: CheckoutPlan;
  companyId: number;
  email: string;
  onSuccess: () => void;
  onCancel: () => void;
}

declare const Accept: any;

export function CheckoutForm({
  plan,
  companyId,
  email,
  onSuccess,
  onCancel,
}: CheckoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    cardNumber: "",
    month: "",
    year: "",
    cardCode: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const authData = {
      clientKey: process.env.NEXT_PUBLIC_PLATFORM_AUTHNET_CLIENT_KEY,
      apiLoginID: process.env.NEXT_PUBLIC_PLATFORM_AUTHNET_API_LOGIN_ID,
    };

    if (!authData.clientKey || !authData.apiLoginID) {
      toast.error(
        "Billing is misconfigured. Missing Authorize.Net public keys.",
      );
      setLoading(false);
      return;
    }

    if (typeof Accept === "undefined" || !Accept?.dispatchData) {
      toast.error(
        "Payment library failed to load. Please refresh and try again.",
      );
      setLoading(false);
      return;
    }

    const cardDetails = {
      cardNumber: cardData.cardNumber.replace(/\s+/g, ""),
      month: cardData.month.padStart(2, "0"),
      year: cardData.year.length === 2 ? `20${cardData.year}` : cardData.year,
      cardCode: cardData.cardCode,
    };

    const billTo = {
      firstName: cardData.firstName ?? "",
      lastName: cardData.lastName ?? "",
      address: cardData.address ?? "",
      city: cardData.city ?? "",
      state: cardData.state ?? "",
      zip: cardData.zip ?? "",
    };
    const secureData = { authData, cardData: cardDetails, billTo };

    try {
      Accept.dispatchData(secureData, async (response: any) => {
        if (response.messages.resultCode === "Error") {
          response.messages.message.forEach((msg: any) =>
            toast.error(msg.text),
          );
          setLoading(false);
        } else {
          const result = await subscribeToPlatformPlan({
            companyId,
            planId: plan.id,
            email,
            firstName: cardData.firstName,
            lastName: cardData.lastName,
            address: cardData.address,
            city: cardData.city,
            state: cardData.state,
            zip: cardData.zip,
            opaqueData: response.opaqueData,
          });

          if (result?.success) {
            toast.success("Successfully subscribed!");
            onSuccess();
          } else {
            toast.error(result?.message || "Subscription failed");
          }
          setLoading(false);
        }
      });
    } catch (err: any) {
      toast.error("Failed to process payment");
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-md w-full animate-in fade-in zoom-in-95 duration-300">
      <Script
        src={
          process.env.NEXT_PUBLIC_PLATFORM_AUTHNET_ENVIRONMENT === "production"
            ? "https://js.authorize.net/v1/Accept.js"
            : "https://jstest.authorize.net/v1/Accept.js"
        }
      />

      {/* Main Glassmorphic Container */}
      <div className="overflow-hidden rounded-3xl bg-white dark:bg-slate-950/90 backdrop-blur-xl ring-1 ring-slate-900/5 dark:ring-white/10 shadow-2xl">
        {/* Header: Visual striking but professional */}
        <div className="bg-gradient-to-r from-[#00b8b0] to-[#0098da] p-1" />
        <div className="px-8 pt-8 pb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Checkout
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Secure payment processing
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
            <ShieldCheck size={14} className="animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              SSL Encrypted
            </span>
          </div>
        </div>

        {/* Plan Summary Card - High Contrast */}
        <div className="mx-8 mb-8 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <CreditCard size={48} className="text-slate-900 dark:text-white" />
          </div>
          <div className="relative z-10 flex justify-between items-end">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">
                Selected Plan
              </p>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {plan.name}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-primary tracking-tighter">
                ${plan.price}
                <span className="text-xs text-slate-400 font-medium lowercase">
                  {plan.interval === "YEARLY" ? "/yr" : "/mo"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 ml-1">
                First Name
              </label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="John"
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-800 rounded-xl focus:ring-2 focus:ring-primary focus:shadow-[0_0_15px_-5px_#6571FF] outline-none transition-all duration-300 text-sm text-slate-600 dark:text-slate-200"
                  value={cardData.firstName}
                  onChange={(e) =>
                    setCardData({ ...cardData, firstName: e.target.value })
                  }
                  required
                />
                <User
                  size={16}
                  className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-primary transition-colors"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 ml-1">
                Last Name
              </label>
              <input
                type="text"
                placeholder="Doe"
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-800 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all duration-300 text-sm text-slate-600 dark:text-slate-200"
                value={cardData.lastName}
                onChange={(e) =>
                  setCardData({ ...cardData, lastName: e.target.value })
                }
                required
              />
            </div>
          </div>

          <BillingAddressFields
            value={cardData}
            onChange={(field, fieldValue) =>
              setCardData({ ...cardData, [field]: fieldValue })
            }
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 ml-1">
              Card Number
            </label>
            <div className="relative group">
              <input
                type="text"
                placeholder="••••  ••••  ••••  ••••"
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-800 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all duration-300 text-sm tracking-widest text-slate-600 dark:text-slate-200"
                value={cardData.cardNumber}
                onChange={(e) =>
                  setCardData({ ...cardData, cardNumber: e.target.value })
                }
                required
              />
              <CreditCard
                size={16}
                className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-primary transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 ml-1">
                Month
              </label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="MM"
                  maxLength={2}
                  className="w-full pl-9 pr-2 py-3 bg-white dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-800 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm text-slate-600 dark:text-slate-200"
                  value={cardData.month}
                  onChange={(e) =>
                    setCardData({ ...cardData, month: e.target.value })
                  }
                  required
                />
                <Calendar
                  size={14}
                  className="absolute left-3 top-4 text-slate-400 group-focus-within:text-primary"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 ml-1">
                Year
              </label>
              <input
                type="text"
                placeholder="YYYY"
                maxLength={4}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-800 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm text-slate-600 dark:text-slate-200"
                value={cardData.year}
                onChange={(e) =>
                  setCardData({ ...cardData, year: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 ml-1">
                CVC
              </label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="•••"
                  maxLength={4}
                  className="w-full pl-9 pr-2 py-3 bg-white dark:bg-slate-900 border-none ring-1 ring-slate-200 dark:ring-slate-800 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm text-slate-600 dark:text-slate-200"
                  value={cardData.cardCode}
                  onChange={(e) =>
                    setCardData({ ...cardData, cardCode: e.target.value })
                  }
                  required
                />
                <Hash
                  size={14}
                  className="absolute left-3 top-4 text-slate-400 group-focus-within:text-primary"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 active:scale-95 disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Lock size={18} />
                )}
                {loading ? "Processing..." : "Authorize Subscription"}
              </span>
              {/* Shimmer Effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000" />
            </button>

            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full text-slate-500 font-semibold py-2 text-sm hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="bg-slate-50/80 dark:bg-slate-900/80 p-6 border-t border-slate-200/50 dark:border-slate-800/50">
          <p className="text-[10px] leading-relaxed text-slate-400 text-center font-medium">
            Payments are processed by Authorize.Net. Your sensitive data never
            touches our servers. By clicking "Authorize", you agree to monthly
            recurring billing.
          </p>
        </div>
      </div>
    </div>
  );
}
