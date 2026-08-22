import { Metadata } from "next";
import CameraPage from "./CameraPage";

export const metadata: Metadata = {
  title: "Inventory - QR Scanner",
  description: "Scan QR codes to quickly find and manage inventory items",
};

export default function Page() {
  return <CameraPage />;
}
