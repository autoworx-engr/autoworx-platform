"use client";
import dynamic from "next/dynamic";

export const AppointmentListClient = dynamic(
  () => import("./AppointmentListClient"),
  { ssr: false },
);

export const ClientNotes = dynamic(() => import("./ClientNotes"), {
  ssr: false,
});
