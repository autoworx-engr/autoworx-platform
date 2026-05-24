"use client";
import ResourceCard from "@/components/resources/ResourceCard";
import ResourceHeader from "@/components/resources/ResourceHeader";
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
];

const DashboardResourcePage = () => {
  const [filter, setFilter] = React.useState({ search: "" });

  return (
    <div>
      <ResourceHeader
        title="Dashboard Resources"
        description="Explore the various resources available for managing your dashboard. From communications to task management, find all the tools you need to optimize your workflow."
        setFilter={setFilter}
      />
      <div className="mt-4 space-y-5">
        {resourcesData
          .filter((resource) =>
            resource.title.toLowerCase().includes(filter.search.toLowerCase()),
          )
          .map((resource, index) => (
            <ResourceCard key={index} resource={resource} index={index} />
          ))}
      </div>
    </div>
  );
};

export default DashboardResourcePage;
