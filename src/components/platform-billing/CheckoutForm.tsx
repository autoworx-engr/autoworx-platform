"use client";

import React, { useState, useEffect } from "react";
import { subscribeToPlatformPlan } from "@/actions/platform-billing/subscribe";
import { toast } from "react-hot-toast";
import { Loader2, CreditCard, Lock } from "lucide-react";
import Script from "next/script";

interface CheckoutFormProps {
  plan: any;
  companyId: number;
  email: string;
  onSuccess: () => void;
  onCancel: () => void;
}

declare const Accept: any;

export function CheckoutForm({ plan, companyId, email, onSuccess, onCancel }: CheckoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState({
    firstName: "",
    lastName: "",
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

    console.log("authData", authData);

    const cardDetails = {
      cardNumber: cardData.cardNumber.replace(/\s+/g, ""),
      month: cardData.month.padStart(2, "0"),
      year: cardData.year.length === 2 ? `20${cardData.year}` : cardData.year,
      cardCode: cardData.cardCode,
    };

    console.log("cardDetails", cardDetails);

    const billTo = {
      firstName: cardData.firstName,
      lastName: cardData.lastName,
    };

    const secureData = {
      authData,
      cardData: cardDetails,
      billTo,
    };

    console.log("secureData", secureData);

    try {
      Accept.dispatchData(secureData, async (response: any) => {
        console.log("response", response);
        if (response.messages.resultCode === "Error") {
          response.messages.message.forEach((msg: any) => {
            toast.error(msg.text);
          });
          setLoading(false);
        } else {
          // Send nonce to server
          const result = await subscribeToPlatformPlan({
            companyId,
            planId: plan.id,
            email,
            firstName: cardData.firstName,
            lastName: cardData.lastName,
            opaqueData: response.opaqueData,
          });

          console.log("result", result);

          if (result.success) {
            toast.success("Successfully subscribed!");
            onSuccess();
          } else {
            toast.error(result.message || "Subscription failed");
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
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 max-w-md w-full">
      <Script
        src={process.env.NEXT_PUBLIC_PLATFORM_AUTHNET_ENVIRONMENT === "production"
          ? "https://js.authorize.net/v1/Accept.js"
          : "https://jstest.authorize.net/v1/Accept.js"}
      />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Complete Subscription</h2>
        <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
          <Lock className="w-3 h-3 mr-1" /> Secure
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Selected Plan</p>
        <div className="flex justify-between items-center mt-1">
          <span className="text-lg font-bold text-gray-800">{plan.name}</span>
          <span className="text-lg font-bold text-[#6571FF]">${plan.price}/mo</span>
        </div>
        {plan.setupFee > 0 && (
          <div className="flex justify-between items-center mt-1 text-sm text-gray-600">
            <span>Setup Fee (One-time)</span>
            <span>${plan.setupFee}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              placeholder="John"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6571FF] outline-none"
              value={cardData.firstName}
              onChange={(e) => setCardData({ ...cardData, firstName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              placeholder="Doe"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6571FF] outline-none"
              value={cardData.lastName}
              onChange={(e) => setCardData({ ...cardData, lastName: e.target.value })}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
          <div className="relative">
            <input
              type="text"
              placeholder="0000 0000 0000 0000"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6571FF] focus:border-transparent outline-none transition"
              value={cardData.cardNumber}
              onChange={(e) => setCardData({ ...cardData, cardNumber: e.target.value })}
              required
            />
            <CreditCard className="absolute right-3 top-3 text-gray-400" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">MM</label>
            <input
              type="text"
              placeholder="MM"
              maxLength={2}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6571FF] outline-none"
              value={cardData.month}
              onChange={(e) => setCardData({ ...cardData, month: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">YYYY</label>
            <input
              type="text"
              placeholder="YYYY"
              maxLength={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6571FF] outline-none"
              value={cardData.year}
              onChange={(e) => setCardData({ ...cardData, year: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
            <input
              type="text"
              placeholder="CVC"
              maxLength={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6571FF] outline-none"
              value={cardData.cardCode}
              onChange={(e) => setCardData({ ...cardData, cardCode: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6571FF] text-white font-bold py-3 rounded-lg shadow-md hover:bg-[#525fec] transition flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Subscribe Now
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full text-gray-500 font-medium py-2 text-sm hover:text-gray-700 transition"
          >
            Cancel
          </button>
        </div>
      </form>

      <p className="text-[10px] text-gray-400 mt-6 text-center">
        Your payment information is encrypted and processed securely by Authorize.Net.
        By subscribing, you agree to recurring monthly charges.
      </p>
    </div>
  );
}
