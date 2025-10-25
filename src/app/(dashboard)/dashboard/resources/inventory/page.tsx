"use client";
import ResourceCard from "@/components/resources/ResourceCard";
import ResourceHeader from "@/components/resources/ResourceHeader";
import React from "react";

const InventoryPage = () => {
  const [filter, setFilter] = React.useState({ search: "" });

  const resourcesData = [
    {
      content: "/images/resources/inventory.png",
      type: "image",
      title: "Inventory Overview",
      description: "An overview of inventory principles and practices.",
    },
    {
      content:
        "https://drive.google.com/file/d/1Xwqhfb9aBdd1wqHnC8a3Ksp4BAOQDb2_/preview",
      type: "video",
      title: "Managing Inventory Effectively",
      description: "A guide to advanced techniques in inventory management.",
    },
  ];

  return (
    <div>
      <ResourceHeader
        title="Reporting Resources"
        description="Explore the various resources available for reporting and analytics."
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

export default InventoryPage;
