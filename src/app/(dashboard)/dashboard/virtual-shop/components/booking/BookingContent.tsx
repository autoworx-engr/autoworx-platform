"use client";

import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useBooking } from "../../context/BookingContext";
import { ProgressBar } from "./ProgressBar";
import { ServiceMenu } from "./ServiceMenu";
import { DateTimeSelection } from "./DateTimeSelection";
import { Checkout } from "./Checkout";
import { Confirmation } from "./Confirmation";
import { CartDrawer } from "./CartDrawer";
import { BookingHeader } from "./BookingHeader";

const BookingContent = () => {
  const { step } = useBooking();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <BookingHeader rightElement="giftcard">
        <ProgressBar current={step} />
      </BookingHeader>

      {/* Content */}
      <main className="container max-w-5xl mx-auto px-4 py-6">
        {step === "services" && <ServiceMenu />}
        {step === "datetime" && <DateTimeSelection />}
        {step === "checkout" && <Checkout />}
        {step === "confirmation" && <Confirmation />}
      </main>

      {/* Cart FAB */}
      {step === "services" && <CartDrawer />}
    </div>
  );
};

export default BookingContent;
