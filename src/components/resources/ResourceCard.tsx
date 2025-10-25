import { cn } from "@/lib/cn";
import Image from "next/image";
import React from "react";

type Props = {
  resource: {
    content: string;
    type: string;
    title: string;
    description: string;
  };
  index: number;
};

const ResourceCard = ({ resource, index }: Props) => {
  return (
    <div
      key={index}
      className="flex flex-col lg:flex-row lg:items-center gap-6 sm:gap-10 lg:gap-20 rounded-lg border border-gray-300 p-4"
    >
      <div>
        {resource.type === "image" ? (
          <div>
            <Image
              src={resource.content}
              alt={resource.title}
              width={800}
              height={500}
              className="rounded-md object-contain border lg:min-w-[480px] lg:max-w-[480px]"
            />
          </div>
        ) : (
          <div className="w-full flex justify-center h-[200px] md:h-[300px] md:w-[480px]">
            <iframe
              src={resource.content}
              allow="autoplay"
              allowFullScreen
              className="rounded-xl shadow-lg w-full h-full"
            ></iframe>
          </div>
        )}
      </div>
      <div
        className={cn(
          `${resource.type === "image" && "text-center"}`,
          "pr-6 sm:pr-10 lg:pr-20"
        )}
      >
        <h2
          className={cn(
            `${resource.type === "image" ? "font-bold text-[22px]" : "text-lg font-semibold"}`
          )}
        >
          {resource.title}
        </h2>
        <p
          className={cn(
            `${resource.type === "image" ? "text-base" : "text-[15px]"}`
          )}
        >
          {resource.description}
        </p>
      </div>
    </div>
  );
};

export default ResourceCard;
