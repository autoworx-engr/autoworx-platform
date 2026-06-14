import { Suspense } from "react";
import BookingForm from "./BookingForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking URL",
  description: "Book an appointment quickly and easily online.",
};

export default async function Page() {
  return (
    <div className="min-h-screen flex justify-center items-center py-6 px-4">
      <Suspense>
        <BookingForm />
      </Suspense>
    </div>
  );
}
