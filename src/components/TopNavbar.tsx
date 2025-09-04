// import TopNavbarIcons from "./TopNavbarIcons";
import dynamic from 'next/dynamic';

const TopNavbarIcons = dynamic(() => import('./TopNavbarIcons'), {
  ssr: false,
});

export default function TopNavbar() {
  return (
    <div className="hidden h-[6vh] items-center justify-end p-5 pr-10 sm:flex">
      <TopNavbarIcons />
    </div>
  );
}
