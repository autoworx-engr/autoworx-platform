import React from 'react';
import AWXBugReport from './AWXBugReport';
// import { usePathname } from 'next/navigation';
// import UserBugReport from './UserBugReport';

const BugReport = () => {
  // const pathname = usePathname();
  // const isAWXDashboard = pathname.startsWith('/awx-dashboard');

  // return isAWXDashboard ? <AWXBugReport /> : <UserBugReport />;
  return <AWXBugReport />;
};

export default BugReport;
