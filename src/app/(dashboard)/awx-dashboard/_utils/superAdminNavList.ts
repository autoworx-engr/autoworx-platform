export const superAdminNavList = [
  {
    title: "Dashboard",
    icon: "/icons/navbar/Dashboard.svg",
    link: "/awx-dashboard",
    path: "/awx-dashboard",
  },
  // {
  //     title: 'Communication Hub',
  //     icon: '/icons/navbar/Community.svg',
  //     path: '/awx-dashboard/communication',
  //     subnav: [
  //         {
  //             title: 'Client',
  //             link: '/awx-dashboard/communication/client',
  //         },
  //         {
  //             title: 'Internal',
  //             link: '/awx-dashboard/communication/internal',
  //         },
  //         {
  //             title: 'Collaboration',
  //             link: '/awx-dashboard/communication/collaboration',
  //         },
  //     ],
  // },
  {
    title: "Directory",
    icon: "/icons/navbar/Employee.png",
    path: "/awx-dashboard/employee",

    subnav: [
      {
        title: "Employee",
        link: "/awx-dashboard/employee",
      },
      {
        title: "Client",
        link: "/awx-dashboard/client",
      },
      {
        title: "Fleet",
        link: "/awx-dashboard/fleet",
      },
    ],
  },
  {
    title: "Analytics and Reporting",
    icon: "/icons/navbar/Analytics.svg",
    link: "/awx-dashboard/reporting/revenue",
    path: "/awx-dashboard/reporting",
  },
];
