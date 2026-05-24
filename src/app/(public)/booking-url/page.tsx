import BookingForm from "./BookingForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking URL",
};

export default async function Page() {
  return (
    <div className="min-h-screen flex justify-center items-center py-6 px-4">
      <BookingForm />
    </div>
  );
}
