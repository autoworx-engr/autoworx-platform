import TaskManagementClient from "./TaskManagementClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Task Management Resources | AutoWorx",
  description:
    "Explore the various resources available for managing your tasks effectively. Learn about task management principles, best practices, and collaboration techniques.",
};

const TaskManagementPage = () => {
  const resourcesData = [
    {
      content: "/images/resources/task_management.png",
      type: "image",
      title: "Task Management Overview",
      description:
        "An overview of task management principles and practices. Covers prioritization, delegation, and progress tracking techniques. Includes tips, tools, and workflows to improve team collaboration.",
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
    <TaskManagementClient
      resourcesData={resourcesData}
      pageTitle="Task Management Resources"
      pageDescription="Explore the various resources available for managing your tasks effectively."
    />
  );
};

export default TaskManagementPage;
