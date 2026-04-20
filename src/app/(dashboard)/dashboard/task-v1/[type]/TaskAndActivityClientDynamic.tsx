"use client";
import dynamic from "next/dynamic";

const TaskAndActivityClient = dynamic(() => import("./TaskAndActivityClient"), {
  ssr: false,
});

export default TaskAndActivityClient;
