"use client";
import ResourceCard from "@/components/resources/ResourceCard";
import ResourceHeader from "@/components/resources/ResourceHeader";
import React from "react";

const PaymentPage = () => {
  const [filter, setFilter] = React.useState({ search: "" });

  const resourcesData = [
    {
      content: "/images/resources/payments.png",
      type: "image",
      title: "Payments Overview",
      description: "An overview of payments principles and practices.",
    },
    {
      content: "",
      type: "video",
      title: "Advanced Payments Techniques",
      description: "A guide to advanced techniques in payments processing.",
    },
  ];

  return (
    <div>
      <ResourceHeader
        title="Payments Resources"
        description="Explore the various resources available for payments."
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

export default PaymentPage;
