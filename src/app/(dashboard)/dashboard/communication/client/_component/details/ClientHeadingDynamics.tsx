"use client";
import dynamic from "next/dynamic";

export const VehicleDetails = dynamic(() => import("./VehicleDetails"), {
  ssr: false,
});

export const CreateAppointment = dynamic(() => import("./CreateAppointment"), {
  ssr: false,
});

export const NewEstimateButton = dynamic(() => import("./NewEstimateButton"), {
  ssr: false,
});
