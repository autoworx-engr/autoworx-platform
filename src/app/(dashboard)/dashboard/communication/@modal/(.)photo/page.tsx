"use client";

import {
  DialogContentBlank,
  DialogOverlay,
  DialogPortal,
  InterceptedDialog,
} from "@/components/Dialog";
import { Circle, CircleX, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type TProps = {
  searchParams: {
    url: string;
  };
};

export default function CommunicationHubImageLoad({ searchParams }: TProps) {
  const router = useRouter();

  const handleImageClick = () => {
    router.back();
  };

  return (
    <InterceptedDialog>
      <div>
        <DialogPortal>
          <DialogOverlay />
          <DialogContentBlank className="#data-[state=open]:animate-in #data-[state=closed]:animate-out fixed left-[50%] top-[50%] z-50 flex max-h-full w-[65%] translate-x-[-50%] translate-y-[-50%] justify-center gap-4 duration-200 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
            <div className="relative no-visible-scrollbar overflow-y-auto bg-white/10 rounded-xl">
              <Image
                src={searchParams.url}
                width={1000}
                height={600}
                alt="photo"
                sizes="100vw"
                className="h-auto max-h-[80vh] w-full"
              />
              <button
                onClick={handleImageClick}
                className="absolute bg-white right-1 top-1 rounded-full text-red-600 z-[999] p-0.5"
              >
                <X className="h-4 w-4 cursor-pointer" />
              </button>
            </div>
          </DialogContentBlank>
        </DialogPortal>
      </div>
    </InterceptedDialog>
  );
}
