import React from "react";
import Image from "next/image";
import Link from "next/link";

export function FirstContact() {
  return (
    <div className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 md:pt-32 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="text-3xl font-bold leading-tight md:text-5xl">
              <span className="bg-custom-gradient-lp bg-clip-text text-transparent">
                STREAMLINE.
                <br />
                MANAGE. GROW.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-justify text-xl leading-relaxed text-black md:text-3xl">
              Autoworx makes running your shop easier than ever! From
              hassle-free client management to streamlining garage operations,
              it’s built for shops of all kinds—whether you specialize in
              graphics, window tint, or full custom work. Simplify your
              day-to-day so you can focus on what you do best—growing your
              business and delivering top-notch service.
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                href="/contact"
                className="flex items-center rounded-lg bg-custom-gradient-lp px-5 py-2 uppercase text-white hover:opacity-90 md:px-8 md:py-3"
              >
                Request A Demo
              </Link>
            </div>
          </div>
          <div className="relative w-full">
            <Image
              src="/landing/firstContact.svg"
              alt="Automotive Workshop"
              className="w-full rounded-sm"
              width={600}
              height={450}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
