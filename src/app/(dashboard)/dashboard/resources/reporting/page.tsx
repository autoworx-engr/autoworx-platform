"use client";
import ResourceCard from "@/components/resources/ResourceCard";
import ResourceHeader from "@/components/resources/ResourceHeader";
import React from "react";

const page = () => {
  const [filter, setFilter] = React.useState({ search: "" });

  const resourcesData = [
    {
      content: "/images/resources/reporting.png",
      type: "image",
      title: "Reporting Overview",
      description: "An overview of reporting principles and practices.",
    },
    {
      content: "",
      type: "video",
      title: "Advanced Reporting Techniques",
      description: "A guide to advanced techniques in reporting and analytics.",
    },
  ];

  return (
    <div>
      <ResourceHeader
        title="Reporting Resources"
        description="Explore the various resources available for reporting and analytics."
        setFilter={setFilter}
      />
      <div className="mt-4 space-y-5">
        {resourcesData
          .filter((resource) =>
            resource.title.toLowerCase().includes(filter.search.toLowerCase())
          )
          .map((resource, index) => (
            <ResourceCard resource={resource} index={index} />
          ))}
      </div>
    </div>
  );
};

export default page;
