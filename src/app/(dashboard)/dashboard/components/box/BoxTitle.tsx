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
    <div className={cn("mb-6 flex items-center justify-between", className)}>
      {/* Title Typography Refinement */}
      <span className="text-xl font-extrabold text-slate-700 dark:text-white md:text-2xl">
        {title}
      </span>{" "}
      {/* Redirect Link with Subtle Interaction */}
      {!!redirectLink && (
        <Link
          href={redirectLink}
          // Applies smooth transition to the icon only
          className="transition-transform duration-300 ease-in-out hover:scale-110"
          aria-label={`Go to ${title} report`}
        >
          {/* Icon Styling: Blue for 'more info' link, subtle size */}
          <ExternalLink className="h-5 w-5 text-blue-500 dark:text-blue-400" />
        </Link>
      )}
    </div>
  );
}
