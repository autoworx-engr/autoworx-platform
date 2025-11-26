"use client";
import Lottie from "lottie-react";
import bikeAnimation from "@/assets/animations/blue-car-loading.json";

export default function CarLoading() {
  return (
    <div className="w-full h-full flex justify-center items-center">
      <Lottie
        animationData={bikeAnimation}
        loop={true}
        style={{ width: 220, height: 220 }}
      />
    </div>
  );
}
