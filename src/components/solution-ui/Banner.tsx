"use client";

import React from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

const chaosStyles = `
  @keyframes chaosRotate {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-5deg); }
    50% { transform: rotate(5deg); }
    75% { transform: rotate(-5deg); }
  }
  
  .chaos-text {
    text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.3), 
             -1px -1px 2px rgba(255, 255, 255, 0.1),
             0 0 20px rgba(1, 167, 158, 0.4);

    display: inline-block;
    animation: chaosRotate 2s ease-in-out infinite;
    transform-origin: center;
  }
`;

export default function Banner() {
  return (
    <div className="bg-[#14252D05] px-4 pb-24 pt-10">
      <style dangerouslySetInnerHTML={{ __html: chaosStyles }} />
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-2">
        <div className="space-y-5">
          <h1 className="text-4xl font-bold leading-tight text-[#0F172A] md:text-5xl lg:text-6xl">
            End the <span className="chaos-text drop-shadow-2xl">Chaos</span> in
            Your Restyling Shop
          </h1>
          <p className="text-lg leading-relaxed text-[#334155] md:text-xl lg:text-2xl">
            Meet Autoworx – The all-in-one platform built by restyling shop
            owners, for restyling shop owners.
          </p>
          <div className="flex max-w-md flex-col gap-4 sm:flex-row">
            <Input placeholder="Enter your email" className="flex-1" />
            <Button
              className="bg-teal-600 px-6 hover:bg-teal-700"
              onClick={() => {
                const el = document.getElementById("call-to-action");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                } else {
                  window.location.hash = "call-to-action";
                }
              }}
            >
              Book Demo →
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            Limited spots available for beta access
          </p>
        </div>

        <div className="relative overflow-hidden rounded-md">
          <video
            className="mx-auto h-[500px] w-[280px] rounded-2xl shadow-lg"
            controls
            autoPlay
            muted
          >
            <source
              src="/videos/solution_video.mp4"
              type="video/mp4"
              className="rounded-2xl"
            />
            Your browser does not support the video tag.
          </video>

          {/* <Image
            src="/images/solution/banner.png"
            alt="Autoworx Platform Preview"
            width={600}
            height={400}
            className="h-auto w-full rounded-lg"
          /> */}
        </div>
      </div>
    </div>
  );
}
