"use client";
import ResourceCard from "@/components/resources/ResourceCard";
import ResourceHeader from "@/components/resources/ResourceHeader";
import React from "react";

const SettingsPage = () => {
  const [filter, setFilter] = React.useState({ search: "" });

  const resourcesData = [
    {
      content: "/images/resources/settings.png",
      type: "image",
      title: "Settings Overview",
      description: "An overview of settings principles and practices.",
    },
    {
      content: "",
      type: "video",
      title: "Advanced Settings Techniques",
      description: "A guide to advanced techniques in settings management.",
    },
  ];

  return (
    <div>
      <ResourceHeader
        title="Settings Resources"
        description="Explore the various resources available for settings management."
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

export default SettingsPage;
