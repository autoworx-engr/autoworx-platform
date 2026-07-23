"use client";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";

type TProps = {
  children: React.ReactNode;
  href: string;
};

export default function ReportLink({ children, href, ...props }: TProps) {
  const pathname = usePathname();
  const isActive = pathname?.includes(href);
  return (
    <Link
      href={href}
      {...props}
      className={cn(
        "flex h-10 w-full items-center justify-center rounded-md border border-primary text-base font-semibold text-primary",
        "sm:h-11 sm:text-lg",
        "lg:h-12 lg:w-40 lg:text-xl",
        isActive && "bg-primary text-white",
      )}
    >
      {children}
    </Link>
  );
}
