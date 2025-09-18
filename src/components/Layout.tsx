"use client";

import { uploadNotificationSettings } from "@/actions/settings/updateNotification";
import { useSetPermissions } from "@/hooks/useSetPermissions";
import { usePermissionStore } from "@/stores/permissionStore";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { EmployeeType } from "@prisma/client";
import { Spin } from "antd";
import { Session } from "next-auth";
import { redirect, usePathname } from "next/navigation";
import { useEffect } from "react";
import MobileNav from "./mobile-responsive/MobileNav";
import PopupState from "./PopupState";
import PrivateRoute from "./PrivateRoute";
import SideNavbar from "./SideNavbar";
import TopNavbar from "./TopNavbar";
import InitOneSignalProvider from "./InitOneSignalProvider";
import { signOut } from "next-auth/react";
import { useSetCompanyFeaturePermission } from "@/hooks/useSetCompanyFeaturePermission";
import { superAdminNavList } from "@/app/(dashboard)/awx-dashboard/_utils/superAdminNavList";
import UserBugReport from "./bug-report/UserBugReport";

const navbarList = [
  {
    title: "Dashboard",
    icon: "/icons/navbar/Dashboard.svg",
    link: "/dashboard",
    path: "/dashboard/dashboard",
  },
  {
    title: "Communication Hub",
    icon: "/icons/navbar/Community.svg",
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
    path: "/dashboard/pipeline",

    subnav: [
      {
        title: "Shop Pipeline",
        link: "/dashboard/pipeline/shop/pipeline",
      },
      {
        title: "Sales Pipeline",
        link: "/dashboard/pipeline/sales/pipeline",
      },
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
];

const mobileNav = [
  ...navbarList, // Existing navList
  {
    title: "Settings", // Add settings here
    icon: "/icons/navbar/Settings.svg", // Ensure this icon exists
    link: "/dashboard/settings/my-account",
    path: "/dashboard/settings",
  },
];
/**
 * Layout component that wraps around page content.
 *
 * - Enforces authentication for `/dashboard/*` routes.
 * - Conditionally displays the `SideNavbar` for authenticated dashboard routes.
 * - Redirects unauthenticated users to the login page for protected routes.
 *
 * @param {Object} props - Component properties.
 * @param {React.ReactNode} props.children - Child components to be rendered within the layout.
 * @param {(Session & { user: { employeeType: string } }) | null} props.session - User session information.
 */

const mobileSuperAdminNav = [
  ...superAdminNavList, // Existing navList
  {
    title: "Settings", // Add settings here
    icon: "/icons/navbar/Settings.svg", // Ensure this icon exists
    link: "/awx-dashboard/settings/my-account",
    path: "/awx-dashboard/settings",
  },
];
export default function Layout({
  session,
  children,
}: {
  session: Session | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname(); // Get the current route path
  const isSuperAdminRoute = pathname?.startsWith("/awx-dashboard");
  useSetPermissions(session); // Set user permissions based on session
  useSetCompanyFeaturePermission(session); // Set user permissions based on session
  const { permissions } = usePermissionStore();
  const currentUser = useGetCurrentUser();

  useEffect(() => {
    const uploadNotificationData = async () => {
      try {
        if (currentUser) {
          const response = await uploadNotificationSettings(
            Number(currentUser?.id),
            currentUser?.employeeType as EmployeeType,
            currentUser?.companyId
          );
        }
      } catch (error) {
        console.log(error);
      }
    };
    uploadNotificationData();
  }, [currentUser?.id, currentUser?.companyId]);

  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      signOut({
        callbackUrl: "/login",
      });
    }
  }, [session?.error]);

  // onesignal icon moveable
  useEffect(() => {
    let timeoutId = setTimeout(() => {
      const bell = document.getElementById("onesignal-bell-launcher");
      // console.log("bell", bell);
      if (!bell) return;

      bell.style.position = "fixed"; // allow free movement
      bell.style.cursor = "grab";

      let isDragging = false;
      let offsetX = 0;
      let offsetY = 0;

      const handleMouseDown = (e: MouseEvent) => {
        isDragging = true;
        const rect = bell.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        bell.style.cursor = "grabbing";
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          bell.style.left = e.clientX - offsetX + "px";
          bell.style.top = e.clientY - offsetY + "px";
        }
      };

      const handleMouseUp = () => {
        isDragging = false;
        bell.style.cursor = "grab";
      };

      bell.addEventListener("mousedown", handleMouseDown);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }, 3000);
    // cleanup
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // If the user is not authenticated, redirect to the login page

  // If the path does not start with "/dashboard", render children without layout
  // If the path does not start with "/dashboard" or "/awx-dashboard", render children without layout
  if (
    !pathname?.startsWith("/dashboard") &&
    !pathname?.startsWith("/awx-dashboard")
  ) {
    return <main>{children}</main>;
  }

  // If the user is not authenticated, redirect to the login page
  if (!session) {
    redirect("/login");
  }

  if (!permissions) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="w-full overflow-y-hidden">
      <SideNavbar
        navList={isSuperAdminRoute ? superAdminNavList : navbarList}
        permissions={permissions}
      />
      <MobileNav
        navList={isSuperAdminRoute ? mobileSuperAdminNav : mobileNav}
        permissions={permissions}
      />
      <div className="sm:ml-[5%]">
        <TopNavbar />
        <PopupState />
        <main className="relative mt-14 max-h-[calc(100vh-56px)] overflow-y-auto bg-[#F8F9FA] sm:mt-0 sm:p-2 sm:px-4 md:h-[93vh]">
          <InitOneSignalProvider />
          <PrivateRoute session={session}>{children}</PrivateRoute>
          <UserBugReport />
        </main>
      </div>
    </div>
  );
}
