"use client";
import ResourceCard from "@/components/resources/ResourceCard";
import ResourceHeader from "@/components/resources/ResourceHeader";
import React from "react";

const TaskManagementPage = () => {
  const [filter, setFilter] = React.useState({ search: "" });

  const resourcesData = [
    {
      content: "/images/resources/task_management.png",
      type: "image",
      title: "Task Management Overview",
      description: "An overview of task management principles and practices.",
    },
    {
      content:
        "https://drive.google.com/file/d/1UR8z7YQ3-H7-r4pb8s99JkD20kwQhTUK/preview",
      type: "video",
      title: "Task Management Best Practices",
      description: "A guide to the best practices in task management.",
    },
  ];

  return (
    <div>
      <ResourceHeader
        title="Task Management Resources"
        description="Explore the various resources available for managing your tasks effectively."
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

export default TaskManagementPage;
