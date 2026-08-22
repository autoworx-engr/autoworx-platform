import { Metadata } from "next";
import LoginContainer from "./LoginContainer";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your account.",
};

export default function Page() {
  return (
    // Background wrapper for depth
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-slate-100 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <LoginContainer />
    </div>
  );
}
