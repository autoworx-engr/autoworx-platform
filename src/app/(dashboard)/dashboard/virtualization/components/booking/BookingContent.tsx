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

const BookingContent = () => {
  const { step } = useBooking();
  const { shopId } = useParams();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={"/icons/Logo.png"}
              alt="AutoWorx"
              className="w-9 h-9 rounded-lg object-cover"
            />
            <div>
              <span
                className="font-bold text-lg tracking-tight leading-tight block"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                ABC Business
              </span>
              <p className="text-[11px] text-muted-foreground leading-tight">
                (555) 123-4567 · 123 Main St, Springfield
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard/virtualization/gift-cards/${shopId || "demo"}`}
          >
            <Button variant="outline" size="sm" className="gap-1.5">
              <Gift className="w-3.5 h-3.5" /> Gift Cards
            </Button>
          </Link>
        </div>
        <div className="container max-w-5xl mx-auto px-4 pb-3">
          <ProgressBar current={step} />
        </div>
      </header>

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
