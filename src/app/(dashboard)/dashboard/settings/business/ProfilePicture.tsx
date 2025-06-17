"use client";
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
    <div className="flex flex-col items-center gap-x-8 sm:flex-row">
      <div
        onClick={handleProfilePictureChange}
        className="relative mb-4 mr-4 flex aspect-square h-[100px] w-[100px] cursor-pointer items-center justify-center rounded-full bg-violet-400/20 p-2"
      >
        <Image
          className="h-full w-full rounded-full object-contain"
          src={
            imageSrc
              ? URL.createObjectURL(imageSrc!)
              : imageUrl
                ? imageUrl
                : "/icons/business.png"
          }
          alt=""
          width={80}
          height={80}
        />
        <div>
          <input
            accept={isPDFPhoto ? ".jpg,.png,.jpeg" : "image/*"}
            hidden
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
            name=""
            id=""
          />
          <Image
            src="/icons/upArrow.png"
            alt=""
            className="absolute bottom-2 right-2 cursor-pointer"
            width={30}
            height={30}
          />
        </div>
      </div>
      <div className="mb-5 sm:mb-0">
        <p className="font-semibold">Profile Picture for Business</p>
        <p className="text-sm italic">
          Optimal Size of image size is 512x512 px (&#60;2.5 MB)
        </p>
      </div>
    </div>
  );
}
