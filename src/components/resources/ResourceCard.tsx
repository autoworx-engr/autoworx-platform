import { cn } from "@/lib/cn";
import Image from "next/image";
import React from "react";

// --- TypeBadge component remains the same for consistency and clarity ---

type Props = {
  resource: {
    content: string;
    type: string;
    title: string;
    description: string;
  };
  index: number;
};

const TypeBadge = ({ type }: { type: string }) => {
  const bg =
    type === "image"
      ? "bg-gradient-to-r from-blue-500 to-indigo-600"
      : type === "video"
        ? "bg-gradient-to-r from-purple-500 to-pink-500"
        : "bg-gradient-to-r from-slate-400 to-slate-600";

  const icon =
    type === "image" ? (
      // photo icon
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 5h16v14H4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 11l2 2 3-3 5 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : (
      // play icon for video
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 3v18l15-9L5 3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-white/95 shadow-sm",
        bg,
        "ring-1 ring-white/20 dark:ring-black/20"
      )}
      aria-hidden={false}
    >
      {icon}
      <span className="capitalize">{type}</span>
    </span>
  );
};

// Renamed and restructured for a Tutorial Header/Cover layout
const TutorialHeader = ({ resource, index }: Props) => {
  const isImage = resource.type === "image";

  return (
    <div
      key={index}
      role="region"
      aria-label={`Cover for tutorial: ${resource.title}`}
      className={cn(
        // Full width container for the cover
        "w-full rounded-3xl p-6 sm:p-10 transition-all duration-500 transform",
        // Enhanced Glassmorphism for the cover area
        "bg-white/70 dark:bg-slate-900/60 ring-1 ring-slate-900/5 dark:ring-white/5 backdrop-blur-xl",
        // A deeper, more dramatic shadow for a focal component
        "shadow-2xl shadow-indigo-500/10 dark:shadow-slate-900/30",
        // No hover lift needed as this is a static header component
        "overflow-hidden relative"
      )}
    >
      {/* 1. Subtle Background Element (Theme Glow/Shimmer) */}
      <span
        className={cn(
          "absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-500",
          isImage
            ? "bg-blue-400/40 dark:bg-indigo-600/30"
            : "bg-purple-400/30 dark:bg-pink-500/25"
        )}
        aria-hidden
      />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* 2. Content Column: Title, Description, and Metadata */}
        <div className="lg:col-span-2 order-2 lg:order-1 flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-3">
            <TypeBadge type={resource.type} />
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Tutorial #{index + 1}
            </span>
          </div>

          <h1
            className={cn(
              "text-3xl sm:text-4xl font-extrabold leading-tight text-slate-900 dark:text-slate-50 mb-3",
              isImage ? "tracking-tight" : "tracking-normal"
            )}
          >
            {resource.title}
          </h1>

          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl">
            {resource.description}
          </p>

          {/* Optional: Add an action button here if needed for starting the tutorial */}
          {/* <button className="mt-6 px-6 py-2 w-fit rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-md hover:shadow-lg transition">
            Start Learning
          </button> */}
        </div>

        {/* 3. Media Column: Image/Video Cover */}
        <div className="lg:col-span-1 order-1 lg:order-2 flex justify-center lg:justify-end">
          <div
            className={cn(
              "relative w-full max-w-md h-[200px] sm:h-[280px] rounded-xl overflow-hidden",
              "shadow-xl ring-2 ring-slate-100/50 dark:ring-slate-800/50" // Stronger ring for the focal media
            )}
          >
            {isImage ? (
              <Image
                src={resource.content}
                alt={`Cover image for ${resource.title}`}
                width={900}
                height={500}
                className="object-left w-full h-full"
                priority // Load the header image immediately
              />
            ) : (
              // For videos, use a prominent placeholder or the iframe itself
              <iframe
                src={resource.content}
                title={`Video cover for ${resource.title}`}
                allow="autoplay; fullscreen"
                className="w-full h-full shadow-inner"
              />
            )}

            {/* Subtle Overlay to ensure Title readability if placed over media */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/5 dark:from-black/10 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Exporting the new component name
export default TutorialHeader;
