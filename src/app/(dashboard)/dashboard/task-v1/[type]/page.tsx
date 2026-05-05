import { Metadata } from "next";
import TaskAndActivityClient from "./TaskAndActivityClientDynamic";

export const metadata: Metadata = {
  title: "Task and Activity Management",
};

export default async function Page(props: {
  params: Promise<{ type: string }>;
}) {
  const params = await props.params;
  return <TaskAndActivityClient params={params} />;
}
