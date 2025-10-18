"use client";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/plugins/captions.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

type ImageItem = {
  id: string;
  src: string;
  description: string;
  title: string;
};

type LightboxProps = {
  getItems: ImageItem[];
};

const ComponentsLightbox = ({ getItems = [] }: LightboxProps) => {
  const [isOpen, setIsOpen] = useState<any>(true);
  const [maxZoomPixelRatio, setMaxZoomPixelRatio] = React.useState(4);

  const router = useRouter();

  const handleImageClick = () => {
    router.back();
  };

  return (
    <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      <Lightbox
        styles={{ container: { backgroundColor: "rgba(0,0,0,0.6)" } }}
        open={isOpen}
        close={() => {
          handleImageClick();
          setIsOpen(false);
        }}
        slides={getItems}
        index={0}
        plugins={[Zoom]}
        zoom={{ maxZoomPixelRatio }}
      />
    </div>
  );
};

export default ComponentsLightbox;
