import FormError from "@/components/FormError";
import SubmitButton from "./SubmitButton";
import Link from "next/link";
import Input from "@/components/Input";
import { Metadata } from "next";


export const metadata: Metadata = {
  title: "Forgot Password",
};

export default function Page() {
  return (
  
     <form className="mx-auto mt-56 max-w-md rounded-md border p-6">
      {/* Title */}
      <h1 className="mb-4 text-center text-2xl font-semibold">
        Forgot Password
      </h1>

      <FormError />

      {/* Email Address */}
      <div className="mb-4">
        <label htmlFor="email" className="mb-2 block">
          Email
        </label>
        <Input
          name="email"
          type="email"
          required
          autoFocus
          className="w-full rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <SubmitButton />

      <Link
        href="/login"
        className="mt-4 block rounded-md text-center text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Remembered your password? Login
      </Link>
    </form>
    
  );
}
