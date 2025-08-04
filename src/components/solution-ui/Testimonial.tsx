import React from "react";
import { Star } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";

export default function Testimonial() {
  return (
    <section className="bg-white py-16">
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

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
              name: "Maria G.",
              title: "Founder at Tint & Shine Auto Studio",
              image: "/images/solution/user/maria.jpg",
              rating: 5,
              quote:
                "I was always buried in paperwork and chasing payments. Autoworx changed everything. My estimates and invoices are all in one place, and customers love the online approval. Plus, they beat my credit card processing rate!",
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
            <Card key={index} className="p-6">
              <CardContent className="flex h-full flex-col p-0">
                <div className="flex-1">
                  <div className="mb-4 flex">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <blockquote className="mb-4 italic text-gray-700">
                    &quot;{testimonial.quote}&quot;
                  </blockquote>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-gray-300">
                    <Image
                      src={testimonial.image}
                      alt={testimonial.name}
                      width={44}
                      height={44}
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {testimonial.title}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
