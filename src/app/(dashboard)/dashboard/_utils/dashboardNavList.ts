import type { NavItem } from "@/lib/navItem";
import { superAdminNavList } from "@/app/(dashboard)/awx-dashboard/_utils/superAdminNavList";

/**
 * Company dashboard navigation.
 *
 * Every `link` here must have an entry in ROUTE_PERMISSIONS_MAP (user
 * permissions) and FEATURE_PERMISSIONS_MAP (company entitlements) or it will be
 * shown to everyone — `filterNavList` also needs a case for the item `title`,
 * otherwise it falls through to "visible".
 */
export const navbarList: NavItem[] = [
  {
    title: "Dashboard",
    icon: "/icons/navbar/Dashboard.svg",
    link: "/dashboard",
    path: "/dashboard/dashboard",
  },
  {
    title: "Communication Hub",
    icon: "/icons/navbar/Community4.svg",
    path: "/dashboard/communication",
    subnav: [
      {
        title: "Client",
        link: "/dashboard/communication/client",
      },
      {
        title: "Internal",
        link: "/dashboard/communication/internal",
      },
      {
        title: "Collaboration",
        link: "/dashboard/communication/collaboration",
      },
    ],
  },
  {
    title: "Pipelines",
    icon: "/icons/navbar/Sales.svg",
    link: "/dashboard/pipeline/sales/pipeline",
    path: "/dashboard/pipeline",
    // Sales / Shop / Team are gated separately; land on the first one allowed.
    altLinks: [
      "/dashboard/pipeline/shop/pipeline",
      "/dashboard/pipeline/team/pipeline",
    ],
  },
  {
    title: "Task and Activity Management",
    icon: "/icons/navbar/Task.svg",
    link: "/dashboard/task/day",
    path: "/dashboard/task",
  },
  {
    title: "Analytics and Reporting",
    icon: "/icons/navbar/Analytics.svg",
    link: "/dashboard/reporting/revenue",
    path: "/dashboard/reporting",
  },
  {
    title: "Invoices",
    icon: "/icons/navbar/Invoices.svg",
    link: "/dashboard/estimate",
    path: "/dashboard/estimate",
  },
  {
    title: "Payments",
    icon: "/icons/navbar/Payments.svg",
    link: "/dashboard/payments",
    path: "/dashboard/payments",
  },
  {
    title: "Inventory",
    icon: "/icons/navbar/Inventory.svg",
    path: "/dashboard/inventory",

    subnav: [
      {
        title: "Inventory List",
        link: "/dashboard/inventory",
      },
      {
        title: "Vendor List",
        link: "/dashboard/inventory/vendor",
      },
      {
        title: "Camera",
        link: "/dashboard/inventory/camera",
      },
    ],
  },
  {
    title: "Directory",
    icon: "/icons/navbar/Employee.png",
    path: "/dashboard/employee",

    subnav: [
      {
        title: "Employee",
        link: "/dashboard/employee",
      },
      {
        title: "Client",
        link: "/dashboard/client",
      },
      {
        title: "Fleet",
        link: "/dashboard/fleet",
      },
    ],
  },
  {
    title: "Visualization",
    icon: "/icons/navbar/visualization.svg",
    link: "/dashboard/visualization",
    path: "/dashboard/visualization",
  },
];

export const mobileNavList: NavItem[] = [
  ...navbarList,
  {
    title: "Settings",
    icon: "/icons/navbar/Settings.svg",
    link: "/dashboard/settings/my-account",
    path: "/dashboard/settings",
  },
];

export const mobileSuperAdminNavList: NavItem[] = [
  ...superAdminNavList,
  {
    title: "Settings",
    icon: "/icons/navbar/Settings.svg",
    link: "/awx-dashboard/settings/my-account",
    path: "/awx-dashboard/settings",
  },
];
