"use client";

import ResourceCard from "@/components/resources/ResourceCard";
import ResourceHeader from "@/components/resources/ResourceHeader";
import React from "react";

const DirectoryPage = () => {
  const [filter, setFilter] = React.useState({ search: "" });

  const resourcesData = [
    {
      content: "/images/resources/directory.png",
      type: "image",
      title: "Directory Overview",
      description: "An overview of the directory structure and organization.",
    },
    {
      content: "",
      type: "video",
      title: "Directory Navigation",
      description: "A guide to navigating the directory effectively.",
    },
  ];

  return (
    <div>
      <ResourceHeader
        title="Directory Resources"
        description="Explore the various resources available for the directory."
        setFilter={setFilter}
      />
      <div className="mt-4 space-y-5">
        {resourcesData
          .filter((resource) =>
            resource.title.toLowerCase().includes(filter.search.toLowerCase())
          )
          .map((resource, index) => (
            <ResourceCard resource={resource} index={index} key={index} />
          ))}
      </div>
    </div>
  );
};

export default DirectoryPage;
