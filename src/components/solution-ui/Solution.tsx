import { CheckCircle } from "lucide-react";
import Image from "next/image";
import React from "react";
import { Badge } from "../ui/badge";

export default function Solution() {
  return (
    <section className="bg-gradient-to-b from-[#F8FAFC] to-[#FFFFFF]">
      <div className="py-16">
        <div className="mx-auto max-w-[1400px] px-4">
          <div className="mb-12 text-center">
            <Badge className="mb-4 bg-teal-100 text-teal-800 hover:bg-teal-100">
              THE SOLUTION
            </Badge>
            <div className="mb-4 flex items-center justify-center gap-5">
              <Image
                src="/images/solution/logo1.png"
                alt="solution-logo"
                width={56}
                height={48}
              />
              <h2 className="text-2xl font-bold text-[#0F172A] md:text-3xl lg:text-4xl">
                The All-in-One Platform
              </h2>
            </div>
            <p className="mx-auto max-w-2xl text-lg text-[#475569]">
              Created by auto restylers who faced the same headaches, Autoworx
              is designed to streamline every aspect of your operation under one
              roof.
            </p>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Image
                src="/images/solution/solution.png"
                alt="Autoworx Dashboard"
                width={660}
                height={320}
                className="h-auto w-full rounded-lg shadow-lg"
              />
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-[#0F172A]">
                One Platform, Everything You Need
              </h3>
              <p className="text-[#475569]">
                Imagine having one platform that handles everything –
                tailor-made for restyling workflows. No more duplicate data
                entry, no more switching between five different apps that
                don&#39;t talk to each other.
              </p>

              <div className="space-y-3">
                {[
                  "Customer contact management",
                  "Estimates & invoices",
                  "Appointments & scheduling",
                  "Inventory tracking",
                  "Team assignments",
                  "Marketing leads & follow-ups",
                  "Integrated payment processing",
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-teal-600" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-teal-50 p-4">
                <p className="text-teal-800">
                  <strong>What does this mean for you?</strong> Fewer mistakes,
                  fewer no-shows, and way less stress. Reclaim hours of lost
                  time each week and keep more money in your pocket.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
