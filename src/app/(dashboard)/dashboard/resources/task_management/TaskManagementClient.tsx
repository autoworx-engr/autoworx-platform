"use client";
import ResourceCard from "@/components/resources/ResourceCard";
import ResourceHeader from "@/components/resources/ResourceHeader";
import React from "react";

interface Resource {
  content: string;
  type: string;
  title: string;
  description: string;
}

interface TaskManagementClientProps {
  resourcesData: Resource[];
  pageTitle: string;
  pageDescription: string;
}

const TaskManagementClient: React.FC<TaskManagementClientProps> = ({
  resourcesData,
  pageTitle,
  pageDescription,
}) => {
  const [filter, setFilter] = React.useState({ search: "" });

  return (
    <div>
      <ResourceHeader
        title={pageTitle}
        description={pageDescription}
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

export default TaskManagementClient;
