import getUser from "@/lib/getUser";
import { redirect } from "next/navigation";
import React from "react";
import MyAccount from "./MyAccount";

const page = async () => {
  const user = await getUser();
  if (!user) redirect("/login");
  return <MyAccount user={user} />;
};

export default page;
