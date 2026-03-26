"use client";

import { Card } from "@/components/ui/card";
import { Store } from "lucide-react";
import Image from "next/image";

export default function ShopNotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-white to-gray-100 p-4">
      <Card className="w-full max-w-3xl space-y-8 p-6 md:p-12">
        <div className="space-y-4 text-center">
          <Store className="mx-auto h-16 w-16 text-[#00b8b0]" />
          <h1 className="bg-gradient-to-r from-[#00b8b0] to-[#0098da] bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl">
            Shop Not Found
          </h1>
          <p className="mx-auto max-w-xl text-lg text-gray-600">
            Oops! The shop you&apos;re looking for doesn&apos;t exist. It might
            have been moved or the URL is incorrect.
          </p>
        </div>

        <div className="flex justify-center">
          <Image
            src="/icons/autoworx-logo.png"
            alt="Autoworx Logo"
            className="h-24 object-contain"
            width={200}
            height={100}
          />
        </div>
      </Card>
    </div>
  );
}
