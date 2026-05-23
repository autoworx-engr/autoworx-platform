import LandingPage from "./components/landing-page/LandingPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Autoworx - Vehicle Service Management Platform",
};

export default async function Page() {
  return <LandingPage />;
}
