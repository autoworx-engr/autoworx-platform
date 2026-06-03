import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coupon QR Code",
  description: "Thank you for scanning the coupon QR code.",
};

// TODO: improve this page. add link to home.
export default function page() {
  return (
    <div className="flex h-screen items-center justify-center text-center text-2xl font-bold">
      <div>Thanks for scanning the coupon QR code!</div>
    </div>
  );
}
