"use client";

import { cn } from "@/lib/cn";
import React, { useTransition } from "react";
import { SiConvertio } from "react-icons/si";

type TProps = {
  onConvert: () => void
};

export default function ConvertTo({ onConvert }: TProps) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="flex items-center gap-x-2 md:inline-block"
      onClick={() => startTransition(onConvert)}
      type="button"
      disabled={pending}
    >
      <span className="md:hidden">Convert</span>
      <SiConvertio className={cn(pending && "animate-spin")} />
    </button>
  );
}
