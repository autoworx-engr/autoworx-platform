"use client";

import ComponentsLightbox from "@/components/common/LightBox";

type TProps = {
  searchParams: {
    urls?: string;
    index?: string;
  };
};

export default function CommunicationHubImageLoad({ searchParams }: TProps) {
  let imageSlides: any = [];
  let startIndex = 0;

  try {
    if (searchParams.urls) {
      const decodedUrls = decodeURIComponent(searchParams.urls);
      const urlsArray: string[] = JSON.parse(decodedUrls);

      imageSlides = urlsArray.map((url) => ({ src: url }));

      startIndex = parseInt(searchParams.index || "0");
    }
  } catch (error) {
    console.error("Failed to parse image URLs:", error);
  }
  return <ComponentsLightbox getItems={imageSlides} startIndex={startIndex} />;
}
