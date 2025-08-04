import React from "react";
import { CheckCircle } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";

export default function Beta() {
  return (
    <section className="bg-gradient-to-br from-[#F0FDFA] to-[#ECFEFF] py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-12 text-center">
          <Badge className="mb-4 bg-[#EF4444] text-white hover:bg-[#EF4444]">
            🔥 Limited Time Offer 🔥
          </Badge>
          <h2 className="mb-4 text-3xl font-bold text-gray-900 lg:text-4xl">
            Beta Launch: Exclusive Offer for a Select Few
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Autoworx is gearing up for its official launch. To ensure it&#39;s
            perfect, we&#39;re running a limited beta program only accepting a
            select group of shops.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 rounded-xl border border-[#CCFBF1] bg-white p-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-6 text-2xl font-bold text-gray-900">
              Why Join the Beta?
            </h3>
            <div className="space-y-4">
              {[
                "Free unlimited access during beta period",
                "Founder-level perks locked in for life",
                "Early-rate pricing once beta ends",
                "Guaranteed lowest payment processing rates",
                "Priority support and feature requests",
              ].map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-teal-600" />
                  <span className="text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg bg-orange-50 p-4">
              <p className="text-orange-800">
                <strong>Payments Bonus:</strong> Autoworx has integrated payment
                processing, and we guarantee to beat or match your current
                rates. The money you save could offset the entire cost!
              </p>
            </div>
          </div>

          <div>
            <Card className="bg-teal-600 p-6 text-white">
              <CardContent className="p-0">
                <h3 className="mb-4 text-xl font-bold">Limited Availability</h3>
                <div className="mb-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Reserved Spots</span>
                    <span>13 remaining</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-teal-500">
                    <div
                      className="h-2 rounded-full bg-white"
                      style={{ width: "33%" }}
                    ></div>
                  </div>
                </div>
                <p className="mb-6 text-teal-100">
                  First-come, first-served for qualified shops. Don&#39;t miss
                  this chance to transform your business.
                </p>
                <Button className="w-full bg-white text-teal-600 hover:bg-gray-100">
                  Claim Your Spot Now →
                </Button>
              </CardContent>
            </Card>
            <div className="">
              <p className="mt-4 text-center text-sm text-[#64748B]">
                Beta access is free, but only open for a handful more shops.
              </p>
              <p className="mt-2 text-center text-sm font-medium text-[#334155]">
                Don&#39;t miss out before we&#39;re full!
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
