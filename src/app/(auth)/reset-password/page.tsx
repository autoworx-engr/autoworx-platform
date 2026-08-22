import React from "react";
import ResetPassword from "./ResetPassword";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your account.",
};

const page = async (props: {
  searchParams: Promise<{
    email?: string;
    token?: string;
  }>;
}) => {
  const searchParams = await props.searchParams;
  const { email, token } = searchParams;
  return <ResetPassword email={email} uriToken={token} />;
};

export default page;
