"use client";

import ComponentsLightbox from "@/components/common/LightBox";

type TProps = {
  searchParams: {
    url: string;
  };
};

export default function CommunicationHubImageLoad({ searchParams }: TProps) {
  return (
    <ComponentsLightbox
      getItems={[
        {
          src: searchParams.url,
        },
      ]}
    />
  );
}
