"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback } from "react";

const BackBtn = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString());
      params.set(key, value);

      return params.toString();
    },
    [searchParams],
  );

  return (
    <svg
      onClick={() => {
        router.push(pathname + "?" + params("details", "false"));
      }}
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.2446 4.09766L6.14677 8.19545L10.2446 12.2932"
        stroke="white"
        strokeWidth="2.3416"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default BackBtn;
