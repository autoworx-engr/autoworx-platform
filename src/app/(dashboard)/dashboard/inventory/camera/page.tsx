import { Metadata } from "next";
import CameraPage from "./CameraPage";

export const metadata: Metadata = {
  title: "Inventory -QR Scanner",
};

export default function Page() {
  return <CameraPage />;
}
