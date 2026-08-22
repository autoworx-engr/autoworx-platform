import { Metadata } from "next";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a new account.",
};

export default function Page() {
  return <RegisterForm />;
}
