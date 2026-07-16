"use client";
import { Camera, ImageIcon } from "lucide-react";
import Image from "next/image";
import React, { ChangeEvent, SetStateAction, useRef } from "react";

type TProps = {
  imageSrc: File | null;
  imageUrl?: string | undefined | null;
  setImageSrc: React.Dispatch<SetStateAction<File | null>>;
  setError?: React.Dispatch<SetStateAction<string | null>>;
  isPDFPhoto?: Boolean | undefined | null;
};

export default function ProfilePicture({
  imageSrc,
  imageUrl,
  setImageSrc,
  setError,
  isPDFPhoto,
}: TProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleProfilePictureChange = (
    e: React.MouseEvent<HTMLImageElement>,
  ) => {
    fileInputRef.current?.click();
  };

  const handleFileChange = function (event: ChangeEvent<HTMLInputElement>) {
    const input = event?.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (file) {
      const imageSizeByMB = (file.size / 1024 / 1024).toFixed(1); // convert to mb
      if (Number(imageSizeByMB) > 2.5) {
        setError && setError("Image size should not exceed 2.5MB.");
        return;
      }
      setError && setError(null);
      setImageSrc(file);
    }
  };
  return (
    <div className="flex flex-col items-center gap-x-8 sm:flex-row border-b pb-3 mb-3">
      <div
        onClick={handleProfilePictureChange}
        className="relative mb-4 flex aspect-square h-24 w-24 cursor-pointer items-center justify-center rounded-full bg-gray-100 p-1 shadow-md hover:shadow-lg transition duration-200 group"
      >
        <Image
          className="h-full w-full rounded-full object-cover transition duration-300 group-hover:opacity-60"
          src={
            imageSrc
              ? URL.createObjectURL(imageSrc!)
              : imageUrl
                ? imageUrl
                : "/icons/business.png"
          }
          alt="Business Profile Picture"
          width={96}
          height={96}
        />
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition duration-300">
          <Camera className="h-6 w-6 text-white" />
        </div>

        {/* Input remains hidden */}
        <input
          accept={isPDFPhoto ? ".jpg,.png,.jpeg" : "image/*"}
          hidden
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
          name=""
          id="profile-picture-upload"
        />
      </div>
      <div className="mb-5 sm:mb-0">
        <p className="font-bold text-lg text-gray-700 flex items-center">
          <ImageIcon className="h-5 w-5 mr-2 text-primary" />
          Business Logo/Picture
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Recommended Size: 512x512 px (&lt;2.5 MB)
        </p>
      </div>
    </div>
  );
}
