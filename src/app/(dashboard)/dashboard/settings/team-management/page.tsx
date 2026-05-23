import { Metadata } from "next";
import TaskManagementPage from "../../resources/task_management/page";

export const metadata: Metadata = {
  title: "Settings - Team Management",
  description: "Manage your team and employees",
};

export default function Page() {
  return <TaskManagementPage />;
}
