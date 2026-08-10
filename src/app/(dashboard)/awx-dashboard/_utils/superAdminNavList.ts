import type { NavItem } from "@/lib/navItem";

/**
 * Platform super-admin navigation.
 *
 * `SUPER_ADMIN_ROUTES_PERMISSIONS_MAP` is derived from this list, so every
 * /awx-dashboard page that should be reachable belongs here. Access itself is
 * enforced by `isSuperAdminOnlyRoute` (whole-prefix), so an omission hides the
 * link without opening the route.
 */
export const superAdminNavList: NavItem[] = [
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

    subnav: [
      {
        title: "Revenue",
        link: "/awx-dashboard/reporting/revenue",
      },
      {
        title: "Churn Rate",
        link: "/awx-dashboard/reporting/churn-rate",
      },
      {
        title: "Bug Reports",
        link: "/awx-dashboard/reporting/bugs",
      },
    ],
  },
  {
    title: "Plans",
    icon: "/icons/navbar/Payments.svg",
    link: "/awx-dashboard/plans",
    path: "/awx-dashboard/plans",
  },
  {
    title: "Webhook Events",
    icon: "/icons/navbar/Task.svg",
    link: "/awx-dashboard/webhook-events",
    path: "/awx-dashboard/webhook-events",
  },
  {
    title: "App Settings",
    icon: "/icons/navbar/Settings.svg",
    link: "/awx-dashboard/app-settings",
    path: "/awx-dashboard/app-settings",
  },
];
