"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

export default function LightTheme({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("light"); //set light theme forcefully for some pages
  }, []);

  return <div>{children}</div>;
}
