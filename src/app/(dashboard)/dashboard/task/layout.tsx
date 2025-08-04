import DnDWrapper from "@/components/DnDWrapper";
import Title from "@/components/Title";
import CalendarSidebar from "./_component/sideBar/CalendarSidebar";

type TaskLayoutProps = {
  children: React.ReactNode;
};

export default async function TaskLayout({ children }: TaskLayoutProps) {
  return (
    <>
      <Title className="hidden md:block">Task and Activity Management</Title>

      <div id="task" className="relative flex h-screen gap-4 pt-4 md:h-[81vh]">
        {/* <SyncLists {...data} /> */}
        <DnDWrapper id="task">
          <CalendarSidebar />
          {children}
        </DnDWrapper>
      </div>
    </>
  );
}
