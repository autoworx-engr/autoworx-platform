import SendPage from "./SendPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Send Notification",
  description: "Send and manage notifications to your team and clients.",
};

export default function Page() {
  return <SendPage />;
}
