"use client";

import { cn } from "@/lib/cn";
import Image from "next/image";
import React from "react";

export default function Avatar({
  photo,
  width,
  height,
  className,
  alt = "User Image",
}: {
  photo?: string;
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
}) {
  // Better handling of photo URL
  const getImageSrc = () => {
    if (
      !photo ||
      photo.trim() === "" ||
      photo === "null" ||
      photo === "undefined"
    ) {
      return "/images/default.png";
    }

    // If photo already contains default.png, use it as is
    if (photo.includes("/images/default.png")) {
      return "/images/default.png";
    }

    // Return the actual photo URL
    return photo;
  };

  return (
    <div
      className={cn("relative overflow-hidden rounded-full", className)}
      style={{
        width: `${width || 50}px`,
        height: `${height || 50}px`,
      }}
    >
      <Image
        src={getImageSrc()}
        alt={alt}
        className={"rounded-full object-cover"}
        fill
        sizes="(max-width: 768px) 100vw, 50px"
        onError={(e) => {
          // Fallback to default image if loading fails
          (e.target as HTMLImageElement).src = "/images/default.png";
        }}
      />
    </div>
  );
}
