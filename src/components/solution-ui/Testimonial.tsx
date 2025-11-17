import React from "react";
import { Star } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import TestimonialCard from "./TestimonialCard";

export default function Testimonial() {
  return (
    <section className="bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="mb-12 text-center">
          <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100">
            TESTIMONIALS
          </Badge>
          <h2 className="mb-4 text-3xl font-bold text-[#0F172A] md:text-4xl lg:text-[40px]">
            Real Restylers, Real Results
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-[#475569]">
            Nothing speaks louder than real-world results. Here&#39;s what early
            Autoworx beta users – owners of shops just like yours – have to say.
          </p>
        </div>

        <div className="max-w-7xl mx-auto grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              name: "Asil M.",
              title: "Owner of TC Customs",
              image: "/landing/OwnerOfTCCustoms.jpeg",
              rating: 5,
              quote: `We’re a small team, so staying organized is everything. Having a sales board to track leads and a separate shop board for active jobs makes it so much easier to stay on top of things—no more missed leads or forgotten installs. The integrated payments are a game-changer—customers pay us before we even have to ask!`,
            },
            {
              name: "Sahel M",
              title: "Owner of ASM Performance",
              image: "/landing/OwnerofASM.jpeg",
              rating: 5,
              quote:
                "Autoworx has completely changed the way we run our shop. Scheduling, invoicing, inventory — everything’s in one place now. We’re saving hours every week, and our team finally feels organized instead of overwhelmed. Couldn’t imagine going back.",
            },
            {
              name: "Angelo W",
              title: "Co owner Luxe Wrap Stars",
              image: "/landing/CoOwnerofLuxe.jpeg",
              rating: 5,
              quote:
                "As both a service and retail shop — where we not only install wraps but also sell materials — Autoworx has been a total game changer. We can finally track which materials are used on each job, what’s sold over the counter, and even the ROI on every product we carry. It’s taken the guesswork out of our inventory and helped us make smarter decisions across the board. No other platform we’ve used comes close.",
            },
          ].map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
