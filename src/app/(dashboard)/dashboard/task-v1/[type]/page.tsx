import { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Task and Activity Management",
};

const TaskAndActivityClient = dynamic(() => import("./TaskAndActivityClient"), {
  ssr: false,
});

export default async function Page({ params }: { params: { type: string } }) {
  return <TaskAndActivityClient params={params} />;
}
