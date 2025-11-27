import Image from "next/image";
import React, { useEffect, useRef } from "react";
import CarLoading from "../common/CarLoading";

type ImageModalProps = {
  setIsModalOpen: (value: boolean) => void;
  setIsImageLoading: (value: boolean) => void;
  setCurrentImageIndex: (value: number) => void;
  currentImageIndex: number;
  isImageLoading: boolean;
  isModalOpen: boolean;
  message?: any;
  isOptimistic: boolean;
  selectedFiles?: File[];
};

const ImageModal: React.FC<ImageModalProps> = ({
  setIsModalOpen,
  message,
  setCurrentImageIndex,
  currentImageIndex,
  setIsImageLoading,
  isImageLoading,
  isModalOpen,
  isOptimistic,
  selectedFiles,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModalOpen]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div ref={modalRef} className="relative max-w-[90%] max-h-[90%]">
        {isImageLoading == false && (
          <button
            className="absolute top-2 right-2 bg-black text-white text-2xl px-1.5 rounded-full"
            onClick={() => setIsModalOpen(false)}
          >
            ✖
          </button>
        )}

        {isImageLoading && (
          <div className="flex items-center justify-center h-[400px] w-[600px]">
            <CarLoading />
          </div>
        )}
        {isOptimistic ? (
          <></>
        ) : (
          <>
            {" "}
            <Image
              src={message.attachment[currentImageIndex].fileUrl}
              alt=""
              width={800}
              height={600}
              className={`max-h-[90vh] rounded shadow ${
                isImageLoading ? "hidden" : "block"
              }`}
              onLoadingComplete={() => setIsImageLoading(false)}
            />
            {message.attachment.length > 1 && !isImageLoading && (
              <div className="absolute top-1/2 left-0 right-0 flex justify-between px-4">
                <button
                  onClick={() => {
                    setIsImageLoading(true);
                    setCurrentImageIndex(
                      (currentImageIndex - 1 + message.attachment.length) %
                        message.attachment.length
                    );
                  }}
                  className="text-white text-3xl bg-black/50 rounded-full px-3"
                >
                  ‹
                </button>
                <button
                  onClick={() => {
                    setIsImageLoading(true);
                    setCurrentImageIndex(
                      (currentImageIndex + 1) % message.attachment.length
                    );
                  }}
                  className="text-white text-3xl bg-black/50 rounded-full px-3"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ImageModal;
