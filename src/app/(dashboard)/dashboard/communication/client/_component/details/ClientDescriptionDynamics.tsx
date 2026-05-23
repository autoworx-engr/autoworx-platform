"use client";
import dynamic from "next/dynamic";

export const AppointmentListClient = dynamic(
  () => import("./AppointmentListClient"),
  { ssr: false },
);

export const ClientNotes = dynamic(() => import("./ClientNotes"), {
  ssr: false,
});

export const VehicleDetails = dynamic(() => import("./VehicleDetails"), {
  ssr: false,
});

export const TaskListSection = dynamic(() => import("./TaskListSection"), {
  ssr: false,
});
