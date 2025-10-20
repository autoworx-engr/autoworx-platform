"use client";
import ResourceHeader from "@/components/resources/ResourceHeader";
import { cn } from "@/lib/cn";
import Image from "next/image";
import React from "react";

const resourcesData = [
  {
    content: "/images/resources/dashboard.png",
    type: "image",
    title: "Learn How to Use the AutoWorx Dashboard",
    description:
      "Discover tutorials and guides to help you navigate and utilize the AutoWorx dashboard effectively. From setting up your account to managing your resources, we've got you covered.",
  },
  {
    content:
      "https://drive.google.com/file/d/18y83uQR355Pzy6WK5nKXQXmRjO5RNNEm/preview",
    type: "video",
    title: "Tutorial 1: Description",
    description:
      "This is a brief description of Tutorial 1. Learn the basics of using the dashboard and get started quickly.",
  },
  {
    content: "",
    type: "video",
    title: "Tutorial 2: Description",
    description:
      "This is a brief description of Tutorial 2. Dive deeper into the features and functionalities of the dashboard.",
  },
  {
    content: "",
    type: "video",
    title: "Tutorial 3: Description",
    description:
      "This is a brief description of Tutorial 3. Explore advanced techniques for maximizing your use of the dashboard.",
  },
];

const page = () => {
  const [filter, setFilter] = React.useState({ search: "" });

  return (
    <div className="max-h-[80vh] overflow-y-auto thin-scrollbar pb-4">
      <ResourceHeader
        title="Dashboard Resources"
        description="Explore the various resources available for managing your dashboard. From communications to task management, find all the tools you need to optimize your workflow."
        setFilter={setFilter}
      />
      <div className="mt-4">
        {resourcesData
          .filter((resource) =>
            resource.title.toLowerCase().includes(filter.search.toLowerCase())
          )
          .map((resource, index) => (
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
                      className="rounded-md object-contain border lg:min-w-[480px]"
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
                className={cn(`${resource.type === "image" && "text-center"}`)}
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
          ))}
      </div>
    </div>
  );
};

export default page;
