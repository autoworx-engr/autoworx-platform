import { Button } from "@/components/ui/button";
import { CheckCircle2, CalendarPlus, FileText, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useBooking } from "../../context/BookingContext";
import toast from "react-hot-toast";

export const Confirmation = () => {
  const {
    cart,
    cartTotal,
    selectedDate,
    selectedSlot,
    customerInfo,
    settings,
    resetBooking,
    estimateId,
  } = useBooking();

  const shopFee = settings.shopFeeEnabled
    ? Math.round((cartTotal * settings.shopFeePercent) / 100)
    : 0;
  const tax = settings.taxEnabled
    ? Math.round(((cartTotal + shopFee) * settings.taxPercent) / 100)
    : 0;
  const grandTotal = cartTotal + shopFee + tax;

  const generateICS = () => {
    if (!selectedDate || !selectedSlot) return;
    const dtStart =
      format(selectedDate, "yyyyMMdd") +
      "T" +
      selectedSlot.time.replace(":", "") +
      "00";
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${dtStart}
SUMMARY:Autoworx Appointment
DESCRIPTION:Services: ${cart.map((i) => i.service.title).join(", ")}
END:VEVENT
END:VCALENDAR`;
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "autoworx-appointment.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewEstimate = () => {
    if (!estimateId) {
      toast.error("Estimate is not ready yet. Please try again in a moment.");
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    const publicInvoiceUrl = baseUrl
      ? `${baseUrl}/public-invoice/${estimateId}`
      : `/public-invoice/${estimateId}`;

    window.location.assign(publicInvoiceUrl);
  };

  return (
    <div className="max-w-lg mx-auto text-center space-y-6 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        <CheckCircle2
          className="w-20 h-20 mx-auto text-primary"
          strokeWidth={1.5}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-3xl font-bold tracking-tight">
          Booking Confirmed!
        </h2>
        <p className="text-muted-foreground mt-1">
          Your appointment has been scheduled
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl border bg-card p-5 text-left space-y-4"
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Appointment Details
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Date:</span>{" "}
              <strong>
                {selectedDate ? format(selectedDate, "MMM d, yyyy") : ""}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground">Time:</span>{" "}
              <strong>{selectedSlot?.label}</strong>
            </div>
          </div>
        </div>

        {customerInfo && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Client
            </p>
            <div className="text-sm space-y-0.5">
              <p className="font-medium">{customerInfo.fullName}</p>
              <p className="text-muted-foreground">
                {customerInfo.email} • {customerInfo.phone}
              </p>
              {customerInfo.vehicleYear && (
                <p className="text-muted-foreground">
                  {customerInfo.vehicleYear} {customerInfo.vehicleMake}{" "}
                  {customerInfo.vehicleModel}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Services
          </p>
          {cart.map((item) => (
            <div key={item.service.id} className="flex justify-between text-sm">
              <span>{item.service.title}</span>
              <span className="font-medium">${item.service.price}</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-bold text-sm">
            <span>Total</span>
            <span>${grandTotal}</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col sm:flex-row gap-3 justify-center"
      >
        <Button variant="outline" onClick={generateICS} className="gap-2">
          <CalendarPlus className="w-4 h-4" /> Add to Calendar
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleViewEstimate}
        >
          <FileText className="w-4 h-4" /> View Estimate
        </Button>
        <Button onClick={resetBooking} className="gap-2">
          <RotateCcw className="w-4 h-4" /> Book Another
        </Button>
      </motion.div>
    </div>
  );
};
