"use client";
import ResourceCard from "@/components/resources/ResourceCard";
import ResourceHeader from "@/components/resources/ResourceHeader";
import React from "react";

const resourcesData = [
  {
    content: "/images/resources/shop_pipeline.png",
    type: "image",
    title: "Learn How to Use the AutoWorx Pipeline",
    description:
      "Discover tutorials and guides to help you navigate and utilize the AutoWorx pipeline effectively. From lead tracking to sales forecasting, we've got you covered.",
  },
  {
    content:
      "https://drive.google.com/file/d/1OFU0s3kLBffzPRxYHcyOWlE9qNll0svZ/preview",
    type: "video",
    title: "Tutorial 1: Description",
    description:
      "This is a brief description of Tutorial 1. Learn the basics of using the pipeline and get started quickly.",
  },
  {
    content:
      "https://drive.google.com/file/d/1Yo10YsD_6MtKsBAFhd7Pps6pNN5MZdJh/preview",
    type: "video",
    title: "Advanced Pipeline Techniques",
    description:
      "Take your pipeline management skills to the next level with these advanced techniques and best practices.",
  },
];

const PipelineResourcePage = () => {
  const [filter, setFilter] = React.useState({ search: "" });

  return (
    <div>
      <ResourceHeader
        title="Pipeline Resources"
        description="Explore the various resources available for managing your pipeline. From lead tracking to sales forecasting, find all the tools you need to optimize your workflow."
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

export default PipelineResourcePage;
