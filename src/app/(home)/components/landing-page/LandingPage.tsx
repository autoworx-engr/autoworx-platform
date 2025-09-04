"use client";
import dynamic from "next/dynamic";



const Hero = dynamic(() => import("./first/components/Hero"));
const ReviewSection = dynamic(() => import("./first/components/ReviewSection"));
const Success = dynamic(() => import("./first/components/Success"));
const WhatWeDoBest = dynamic(() => import("./first/components/WhatWeDoBest"));
const JoinPlatform = dynamic(() => import("./first/components/JoinPlatform"));
const Last = dynamic(() => import("./Last"));



export default function LandingPage() {
  return (
    <div  className="text-black">
      <Hero />
      <Success />
      <ReviewSection />
      <WhatWeDoBest />
      <JoinPlatform />
      <Last />
     
    </div>
  );
}
