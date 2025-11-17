"use client";
import ResourceCard from "@/components/resources/ResourceCard";
import ResourceHeader from "@/components/resources/ResourceHeader";
import React from "react";

const LeadPage = () => {
  const [filter, setFilter] = React.useState({ search: "" });

  const resourcesData = [
    {
      content: "/images/resources/lead.png",
      type: "image",
      title: "Lead Overview",
      description: "An overview of lead principles and practices.",
    },
    {
      content:
        "https://drive.google.com/file/d/1oAvjro7Yx1Jg3CjooMYwAmKE4TMzksIw/preview",
      type: "video",
      title: "Managing Leads Effectively",
      description: "A guide to advanced techniques in lead management.",
    },
  ];

  return (
    <div>
      <ResourceHeader
        title="Lead Resources"
        description="Explore the various resources available for lead management."
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

export default LeadPage;
