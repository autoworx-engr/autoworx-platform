"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

export default function Page() {
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const handleDecode = (detectedCodes: { rawValue?: string }[]) => {
    const text = detectedCodes[0]?.rawValue;
    if (!text) return;

    try {
      const url = new URL(text);

      if (url.origin !== window.location.origin) {
        console.error("Blocked redirect to external URL:", text);
        return;
      }

      setResult(text);
      router.push(url.pathname + url.search);
    } catch {
      console.error("Invalid QR code URL:", text);
    }
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-bold">Scan QR Code</h1>

      {result ? (
        <h2>Redirecting to {new URL(result).pathname}</h2>
      ) : (
        <div className="h-[300px] w-[300px] lg:h-[400px] lg:w-[400px]">
          <Scanner
            constraints={{ facingMode: "environment" }}
            onScan={handleDecode}
            onError={(err: unknown) => {
              if (err && typeof err === "object" && "message" in err) {
                console.error((err as any).message);
              } else {
                console.error(err);
              }
            }}
            // You can adjust styles/sizes as needed
          />
        </div>
      )}
    </div>
  );
}
