import DnDWrapper from "@/components/DnDWrapper";
import Title from "@/components/Title";
import CalendarSidebar from "./_component/sideBar/CalendarSidebar";
import MobileSidePanel from "./_component/sideBar/MobileSidePanel";

type TaskLayoutProps = {
  children: React.ReactNode;
};

export default async function TaskLayout({ children }: TaskLayoutProps) {
  return (
    <>
      {/* The panel trigger sits beside the title because the side panel itself
          is desktop-only — see MobileSidePanel. */}
      <div className="flex items-center justify-between gap-3 px-3 pt-3 sm:px-0 sm:pt-0">
        <Title className="truncate text-lg sm:text-xl md:text-[26px]">
          Task and Activity Management
        </Title>
        <MobileSidePanel />
      </div>

      <div
        id="task"
        className="relative flex h-[calc(100vh-8rem)] gap-4 pt-3 md:h-[81vh] md:pt-4"
      >
        {/* <SyncLists {...data} /> */}
        <DnDWrapper id="task">
          <CalendarSidebar />
          {children}
        </DnDWrapper>
      </div>
    </>
  );
}
