import React from "react";
import ResetPassword from "./ResetPassword";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
};

const page = ({
  searchParams,
}: {
  searchParams: {
    email?: string;
    token?: string;
  };
}) => {
  const { email, token } = searchParams;
  return <ResetPassword email={email} uriToken={token} />;
};

export default page;
