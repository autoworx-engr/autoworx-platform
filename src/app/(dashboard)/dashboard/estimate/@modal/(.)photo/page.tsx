"use client";
import { use } from "react";

import ComponentsLightbox from "@/components/common/LightBox";

type TProps = {
  searchParams: Promise<{
    urls?: string;
    url?: string;
    index?: string;
  }>;
};

export default function InvoiceImageLoad(props: TProps) {
  const searchParams = use(props.searchParams);
  let imageSlides: any = [];
  let startIndex = 0;

  try {
    const raw = searchParams?.urls ?? (searchParams as any)?.url;
    if (raw) {
      const decoded = decodeURIComponent(raw);
      try {
        const parsed = JSON.parse(decoded);
        if (Array.isArray(parsed)) {
          imageSlides = parsed.map((u: string) => ({ src: u }));
        } else if (typeof parsed === "string") {
          imageSlides = [{ src: parsed }];
        }
      } catch (e) {
        if (decoded.includes(",")) {
          imageSlides = decoded.split(",").map((s) => ({ src: s.trim() }));
        } else {
          imageSlides = [{ src: decoded }];
        }
      }
    }
    startIndex = parseInt(searchParams.index || "0");
  } catch (error) {
    console.error("Failed to parse image URLs:", error);
  }
  return <ComponentsLightbox getItems={imageSlides} startIndex={startIndex} />;
}
