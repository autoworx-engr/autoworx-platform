import Dashboard from "./components/Dashboard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard",
};

export default function Page() {
  return <Dashboard />;
}
