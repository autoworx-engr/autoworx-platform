import DnDWrapper from "@/components/DnDWrapper";
import Title from "@/components/Title";
import CalendarSidebar from "./_component/sideBar/CalendarSidebar";

type TaskLayoutProps = {
  children: React.ReactNode;
};

export default async function TaskLayout({ children }: TaskLayoutProps) {
  return (
    <>
      <Title className="px-3 pt-3 text-lg sm:px-0 sm:pt-0 sm:text-xl md:text-[26px]">
        Task and Activity Management
      </Title>

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
