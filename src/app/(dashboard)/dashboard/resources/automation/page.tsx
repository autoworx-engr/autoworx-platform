"use client";
import ResourceCard from "@/components/resources/ResourceCard";
import ResourceHeader from "@/components/resources/ResourceHeader";
import React from "react";

const SettingsPage = () => {
  const [filter, setFilter] = React.useState({ search: "" });

  const resourcesData = [
    {
      content: "/images/resources/automation.png",
      type: "image",
      title: "Automation Overview",
      description: "An overview of automation principles and practices.",
    },
    {
      content: "",
      type: "video",
      title: "Advanced Automation Techniques",
      description: "A guide to advanced techniques in automation management.",
    },
  ];

  return (
    <div>
      <ResourceHeader
        title="Automation Resources"
        description="Explore the various resources available for automation management."
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

export default SettingsPage;
