"use client";
import Lottie from "lottie-react";
import bikeAnimation from "@/assets/animations/blue-car-loading.json";

export default function CarLoading() {
  return (
    <div className=" flex justify-center items-center">
      <Lottie
        animationData={bikeAnimation}
        loop={true}
        style={{
          width: 220,
          height: 220,
          background: "white",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}
