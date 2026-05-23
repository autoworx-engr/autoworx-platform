"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useCallback } from "react";

type Props = {
  asIcon?: boolean;
  label?: string;
  icon?: ReactNode;
};

const BackBtn = ({ asIcon, label, icon }: Props) => {
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

  const handleClick = () => {
    router.push(pathname + "?" + params("details", "false"));
  };

  if (asIcon) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={label ?? "Close"}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-white/10"
      >
        {icon}
      </button>
    );
  }

  return (
    <svg
      onClick={handleClick}
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="cursor-pointer"
    >
      <path
        d="M10.2446 4.09766L6.14677 8.19545L10.2446 12.2932"
        stroke="currentColor"
        strokeWidth="2.3416"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default BackBtn;
