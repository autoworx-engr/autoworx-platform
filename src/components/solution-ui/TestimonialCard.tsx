import React from "react";
import { Card, CardContent } from "../ui/card";
import { Star } from "lucide-react";
import Image from "next/image";

type Testimonial = {
  name: string;
  title: string;
  image: string;
  rating: number;
  quote: string;
};

export default function TestimonialCard({
  testimonial,
}: {
  testimonial: Testimonial;
}) {
  return (
    <Card className="p-6">
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
            <div className="text-sm text-gray-600">{testimonial.title}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
