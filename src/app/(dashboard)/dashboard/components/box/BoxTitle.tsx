import React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ExternalLink } from "lucide-react";

type TBoxTitleProps = {
  title: string;
  redirectLink?: string;
  className?: string;
};

export default function BoxTitle({
  title,
  redirectLink,
  className,
}: TBoxTitleProps) {
  return (
    <div className={cn("mb-8 flex items-center justify-between", className)}>
      <span className="text-xl font-bold">{title}</span>{" "}
      {!!redirectLink && (
        <Link href={redirectLink}>
          <ExternalLink />
        </Link>
      )}
    </div>
  );
}
