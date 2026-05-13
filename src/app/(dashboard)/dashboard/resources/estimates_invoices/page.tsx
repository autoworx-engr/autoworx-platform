"use client";
import ResourceCard from "@/components/resources/ResourceCard";
import ResourceHeader from "@/components/resources/ResourceHeader";
import React from "react";

const page = () => {
  const [filter, setFilter] = React.useState({ search: "" });

  const resourcesData = [
    {
      content: "/images/resources/invoices.png",
      type: "image",
      title: "Estimates & Invoices Overview",
      description:
        "An overview of estimates and invoices principles and practices.",
    },
    {
      content:
        "https://drive.google.com/file/d/1bZVkJAw6rkBWj6L6wOzymDghmbvWUWRC/preview",
      type: "video",
      title: "Create an estimate",
      description:
        "A step-by-step tutorial on creating estimates in the system.",
    },
    {
      content:
        "https://drive.google.com/file/d/1Vr3mMvnXD8nhUQU1kCrEfT-hC_yygfNE/preview",
      type: "video",
      title: "Navigating digital estimates",
      description:
        "A guide to creating and managing digital estimates effectively.",
    },
    {
      content:
        "https://drive.google.com/file/d/183quI-RECPHsv-SMlLUd8fdKBkj2F78F/preview",
      type: "video",
      title: "Creating a work order",
      description:
        "A step-by-step tutorial on creating work orders from estimates.",
    },
    {
      content:
        "https://drive.google.com/file/d/1aUlJT_b-fGneW7xYtkmub_-4cxNdoj_j/preview",
      type: "video",
      title: "Saving canned labor and canned services",
      description:
        "Instructions on how to save and utilize canned labor and services in estimates.",
    },
    {
      content:
        "https://drive.google.com/file/d/1zsn87hycOPqiFQ6NV5Mkh4T-Xk3P-EbA/preview",
      type: "video",
      title: "Accepting a payment",
      description: "Instructions on how to accept a payment in the system.",
    },
  ];

  return (
    <div>
      <ResourceHeader
        title="Estimates & Invoices Resources"
        description="Explore the various resources available for estimates and invoices."
        setFilter={setFilter}
      />
      <div className="mt-4 space-y-5">
        {resourcesData
          .filter((resource) =>
            resource.title.toLowerCase().includes(filter.search.toLowerCase()),
          )
          .map((resource, index) => (
            <ResourceCard resource={resource} index={index} />
          ))}
      </div>
    </div>
  );
};

export default page;
