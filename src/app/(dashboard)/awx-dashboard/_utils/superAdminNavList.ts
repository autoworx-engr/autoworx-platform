export const superAdminNavList = [
  {
    title: "Dashboard",
    icon: "/icons/navbar/Dashboard.svg",
    link: "/awx-dashboard",
    path: "/awx-dashboard",
  },
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
  {
    title: "App Settings",
    icon: "/icons/navbar/Settings.svg",
    link: "/awx-dashboard/app-settings",
    path: "/awx-dashboard/app-settings",
  },
];
