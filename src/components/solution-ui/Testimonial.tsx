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

        <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-2">
          {[
            {
              name: "Alex P.",
              title: "Owner of WrapStars Custom Garage",
              image: "/images/solution/user/alex.jpg",
              rating: 5,
              quote:
                "Autoworx turned our chaos into a well-oiled machine. We went from using 5 separate apps to just one. Now I never worry about things slipping through the cracks – every lead, every payment is tracked. Our monthly revenue jumped 22% in the first month.",
            },
            {
              name: "Mike T.",
              title: "Manager at Executive Auto Customization",
              image: "/images/solution/user/mike.jpg",
              rating: 5,
              quote:
                "Before Autoworx, we were booked solid but our profit margins were slim. Their inventory system helped us stop ordering excess material, and the scheduling tools eliminated costly double-bookings. It's like having an extra employee without the payroll.",
            },
          ].map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
