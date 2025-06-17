"use client";

import { SyncLists } from "@/components/SyncLists";
import Title from "@/components/Title";
import { fetchTaskPageData } from "@/lib/fetchTaskPageData";
import { useCalendarStore } from "@/stores/calendarStore";
import { CalendarType } from "@/types/calendar";
import { Spin } from "antd";
import { useEffect, useState } from "react";
import TaskPage from "./TaskPage";

export default function TaskAndActivityClient({ params }: any) {
  const { reset, month, updateVariable, isNavigating } = useCalendarStore();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Only reset if we're not in the middle of a navigation from another calendar view
    console.log(isNavigating);
    
    if (!isNavigating) {
      reset();
    }
  }, [isNavigating, reset]);
  

  useEffect(() => {
    if (month) {
      const loadData = async () => {
        const data = await fetchTaskPageData(month);
        setData(data);
      };
      loadData();
    }
  }, [month, updateVariable]);

  if (!data) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-4">
        <Spin />
      </div>
    );
  }

  return (
    <>
      <Title className="hidden md:block">Task and Activity Management</Title>

      <div id="task" className="relative flex h-screen gap-4 pt-4 md:h-[81vh]">
        <SyncLists {...data} />
        <TaskPage type={params.type as CalendarType} {...data} />
      </div>
    </>
  );
}
