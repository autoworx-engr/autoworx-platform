import { Metadata } from "next";
import TeamManagementPage from "./TeamManagementPage";

export const metadata: Metadata = {
  title: "Settings - Team Management",
  description: "Manage your team and employees",
};

export default function Page() {
  return <TeamManagementPage />;
}
