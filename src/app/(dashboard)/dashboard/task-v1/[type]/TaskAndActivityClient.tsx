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
  const { reset, month, updateVariable, isNavigating, setNavigating } = useCalendarStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only reset if we're not in the middle of a navigation from another calendar view
    console.log("Navigation state:", isNavigating);
    
    if (!isNavigating) {
      reset();
    }
    
    // Clear navigation flag after component mounts
    if (isNavigating) {
      const timer = setTimeout(() => {
        setNavigating(false);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isNavigating, reset, setNavigating]);
  

  useEffect(() => {
    if (month) {
      const loadData = async () => {
        try {
          setLoading(true);
          const data = await fetchTaskPageData(month);
          setData(data);
        } catch (error) {
          console.error("Error loading task data:", error);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
  }, [month, updateVariable]);

  if (loading || !data) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-4">
        <Spin size="large" />
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
