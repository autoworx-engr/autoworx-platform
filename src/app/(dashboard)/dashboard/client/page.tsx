import Title from "@/components/Title";
import "react-date-range/dist/styles.css"; // main style file
import "react-date-range/dist/theme/default.css"; // theme css file
import ClientList from "./ClientList";
import Header from "./Header";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Directory - Client",
  description: "Manage your clients",
};

export default async function Page() {
  return (
    <div className="h-full w-full space-y-8 px-2">
      <Title>Client List</Title>

      <Header />
      <ClientList />
    </div>
  );
}
