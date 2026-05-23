import SendPage from "./SendPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Send Notification",
};

export default function Page() {
  return <SendPage />;
}
