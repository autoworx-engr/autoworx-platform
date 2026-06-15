import { Metadata } from "next";
import DeleteAccountPage from "./DeleteAccountPage";

export const metadata: Metadata = {
  title: "Delete Account",
  description: "Permanently delete your account and all associated data.",
};

export default function Page() {
  return <DeleteAccountPage />;
}
