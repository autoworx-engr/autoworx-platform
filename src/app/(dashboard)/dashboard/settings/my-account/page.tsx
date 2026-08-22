import getUser from "@/lib/getUser";
import { redirect } from "next/navigation";
import React from "react";
import MyAccount from "./MyAccount";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - My Account",
  description: "Manage your account",
};

const page = async () => {
  const user = await getUser();
  if (!user) redirect("/login");
  return <MyAccount user={user} />;
};

export default page;
