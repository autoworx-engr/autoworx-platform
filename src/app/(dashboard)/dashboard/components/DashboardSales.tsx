import AppointmentListBox from "./box/AppointmentListBox";
import PerformanceBoxForSalesUser from "./box/PerformanceBoxForSalesUser";
import RecentMessagesBox from "./box/RecentMessagesBox";
import TaskListBox from "./box/TaskListBox";
import { cn } from "@/lib/cn"; // Ensure cn utility is imported

export default function DashboardSales() {
  return (
    // Outer Container: Set to use the full available height and create an organized grid gap
    <div
      className={cn(
        `
          // Base Layout (Mobile): Vertical stacking with ample space
          flex flex-col gap-y-6 lg:gap-y-0

          // Desktop Layout (lg and up): 4-Column Grid structure
          lg:grid lg:grid-cols-12 lg:gap-x-8 xl:gap-x-6

          // CRITICAL: Full-screen height for a dashboard view, excluding header/navbar height
          h-full lg:h-[calc(100vh-80px)]

          // Base padding to avoid touching screen edges
          p-4 md:p-6
        `
      )}
    >
      {/* The layout is now driven by a 12-column grid system for precision.
        Suggested Split: 3 / 3 / 3 / 3 (or 3 / 3 / 2 / 4 for an asymmetric look)
        Let's use a 3 / 3 / 2 / 4 split for an emphasized Messages box.
      */}

      {/* COL 1: Task List (lg:col-span-3) - Standard Height */}
      <div className="lg:col-span-3 h-full">
        <TaskListBox />
      </div>

      {/* COL 2: Appointments List (lg:col-span-3) - Standard Height */}
      <div className="lg:col-span-3 h-full">
        <AppointmentListBox />
      </div>

      {/* COL 3: Performance/Metrics (lg:col-span-2) - Smaller Width for a Metrics Column */}
      {/* CRITICAL: Must maintain aspect ratio or fix height for metrics box. We use h-full. */}
      <div className="lg:col-span-2 h-full">
        {/* PerformanceBoxForSalesUser is assumed to contain vertical metric cards */}
        <PerformanceBoxForSalesUser />
      </div>

      {/* COL 4: Recent Messages (lg:col-span-4) - Wider Column for a deep list component */}
      <div className="lg:col-span-4 h-full">
        <RecentMessagesBox />
      </div>
    </div>
  );
}
