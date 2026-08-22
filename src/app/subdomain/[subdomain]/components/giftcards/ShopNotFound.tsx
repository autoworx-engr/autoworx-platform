"use client";

import { Card } from "@/components/ui/card";
import { Store } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function ShopNotFound() {
  const pathname = usePathname();
  const shouldShowConfigure = pathname.startsWith(
    "/dashboard/virtual-shop/admin",
  );

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-white to-gray-100 p-4">
      <Card className="w-full max-w-3xl space-y-8 p-6 md:p-12">
        <div className="space-y-4 text-center">
          <Store className="mx-auto h-16 w-16 text-[#00b8b0]" />
          <h1 className="bg-gradient-to-r from-[#00b8b0] to-[#0098da] bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl">
            Shop Not Found
          </h1>
          <p className="mx-auto max-w-xl text-lg text-gray-600">
            Oops! The shop you&apos;re looking for doesn&apos;t exist.{" "}
            {shouldShowConfigure ? (
              <span>Please configure your shop to access this section.</span>
            ) : (
              <span>It might have been moved or the URL is incorrect.</span>
            )}
          </p>

          <div className="flex justify-center">
            <Image
              src="/icons/autoworx-logo.png"
              alt="Autoworx Logo"
              className="h-24 object-contain"
              width={200}
              height={100}
            />
          </div>
          {shouldShowConfigure && (
            <div className="pt-2">
              <a
                href="/dashboard/settings/virtual-shop-configure"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-[#5a66ee] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_0_rgba(101,113,255,0.39)] transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]"
              >
                Go to shop configure
              </a>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
