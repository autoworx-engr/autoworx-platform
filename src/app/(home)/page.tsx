import LandingPage from "./components/landing-page/LandingPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Autoworx - Vehicle Service Management Platform",
  description:
    "Autoworx makes running your shop easier than ever. Streamline client management, garage operations, and more.",
};

export default async function Page() {
  return <LandingPage />;
}
