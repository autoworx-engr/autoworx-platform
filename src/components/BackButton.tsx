"use client";

import { cn } from "@/lib/cn";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type BackButtonProps = {
  href?: string;
  className?: string;
  "aria-label"?: string;
};

const BackButton = ({
  href,
  className,
  "aria-label": ariaLabel = "Go back",
}: BackButtonProps) => {
  const router = useRouter();
  const buttonClassName = cn(
    "flex items-center justify-center rounded-full p-1 text-slate-600 transition-all hover:bg-slate-100 active:scale-[0.95] dark:text-white dark:hover:bg-slate-700/50",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={buttonClassName} aria-label={ariaLabel}>
        <ArrowLeft className="w-5 h-5" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={buttonClassName}
      aria-label={ariaLabel}
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
};

export default BackButton;
