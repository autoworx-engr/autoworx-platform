import { Metadata } from "next";
import LoginPage from "./LoginPage";

export const metadata: Metadata = {
  title: "Login | Luminar CRM",
};

export default function Page() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-app-sheen p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(45,212,191,0.12),transparent)]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[120%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(15,118,110,0.06),transparent_70%)]" />
      <LoginPage />
    </div>
  );
}
