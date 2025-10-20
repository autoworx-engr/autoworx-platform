"use client";

import ResourceCard from "@/components/resources/ResourceCard";
import ResourceHeader from "@/components/resources/ResourceHeader";
import React from "react";

const CommunicationResourcePage = () => {
  const [filter, setFilter] = React.useState({ search: "" });

  const resourcesData = [
    {
      content: "/images/resources/communication_hub.png",
      type: "image",
      title: "Communication Hub Overview",
      description: "Get an overview of the communication hub and its features.",
    },
    {
      content:
        "https://drive.google.com/file/d/1yhlZSEZsQ8JA0ZtD0a8phzMZo5iGwsUm/preview",
      type: "video",
      title: "Tutorial: Using the Communication Hub",
      description:
        "Watch this tutorial to learn how to use the communication hub effectively.",
    },
  ];

  return (
    <div>
      <ResourceHeader
        title="Communication Hub Resources"
        description="Explore the various resources available for managing your communication hub. From messaging to video conferencing, find all the tools you need to optimize your workflow."
        setFilter={setFilter}
      />
      <div className="mt-4">
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

export default CommunicationResourcePage;
