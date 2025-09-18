"use client";
import { cn } from "@/lib/cn";
import { usePermissionStore } from "@/stores/permissionStore";
import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
import { FEATURE_PERMISSIONS_MAP } from "@/lib/routePermissionsMap";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";

type Props = {};

const accountSettings = [
  {
    link: "/dashboard/settings/my-account",
    label: "My Account",
  },

  {
    link: "/dashboard/settings/notifications",
    label: "Notifications",
  },
];
const businessSettings = [
  {
    link: "/dashboard/settings/business",
    label: "Business Profile",
  },
  {
    link: "/dashboard/settings/networks",
    label: "My Network",
  },
  {
    link: "/dashboard/settings/team-management",
    label: "Team Managements",
  },
  {
    link: "/dashboard/settings/payments",
    label: "Payments",
  },
  {
    link: "/dashboard/settings/estimates",
    label: "Estimates & Invoice",
  },
  {
    link: "/dashboard/settings/billing",
    label: "Billing",
  },
  {
    link: "/dashboard/settings/communications",
    label: "Communications Hub",
  },

  {
    link: "/dashboard/settings/leadgeneration",
    label: "Lead Capture",
  },
  {
    link: "/dashboard/settings/automation",
    label: "Automation",
  },
];

const Sidebar = (props: Props) => {
  const path = usePathname();
  const { permissions } = usePermissionStore();
  const { companyFeaturePermission } = useCompanyFeaturePermissionStore();
  // Helper: Check if company feature permission allows access to this route
  function canAccessCompanyFeatureRoute(route: string): boolean {
    if (!companyFeaturePermission || companyFeaturePermission.length === 0)
      return true;
    const routeWithoutQuery = route.split("?")[0];
    const featureKey = FEATURE_PERMISSIONS_MAP[routeWithoutQuery];
    if (!featureKey) return true;
    if (Array.isArray(featureKey)) {
      return featureKey.some(key =>
        companyFeaturePermission.some(
          perm => perm.permission_name === key && perm.enabled
        )
      );
    }
    return companyFeaturePermission.some(
      perm => perm.permission_name === featureKey && perm.enabled
    );
  }

  const filteredAccountSettings = accountSettings.filter(setting =>
    canAccessCompanyFeatureRoute(setting.link)
  );
  const filteredBusinessSettings = businessSettings.filter(setting =>
    canAccessCompanyFeatureRoute(setting.link)
  );
  // State to handle sidebar visibility on small screens
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Close sidebar if click is outside of the sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setIsSidebarOpen(false); // Close the sidebar if click outside
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="">
      {/* for mobile view */}
      <div className="block lg:hidden">
        <button className={`ml-5 text-xl`} onClick={toggleSidebar}>
          {isSidebarOpen ? <FaTimes /> : <FaBars />}
        </button>
        <div
          ref={sidebarRef}
          className={cn(
            `fixed left-0 top-0 z-50 mb-14 mt-14 h-full w-[280px] transform overflow-y-auto bg-background px-6 py-8 pb-14 shadow-xl transition-transform duration-300 ease-in-out`,
            {
              "translate-x-0": isSidebarOpen,
              "-translate-x-full": !isSidebarOpen,
              "sm:ml-14 md:ml-14 lg:ml-14": isSidebarOpen, // Margin applied when sidebar is open
              "sm:ml-0 md:ml-0": !isSidebarOpen, // No margin when sidebar is closed
            }
          )}
        >
          <div className="flex items-end justify-end align-middle">
            <button className="text-end text-xl" onClick={toggleSidebar}>
              {isSidebarOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>

          <h3 className="mb-4 font-bold">
            <span className="border-b-2 pb-1">Account Settings</span>
          </h3>
          <div className="mb-8 space-y-2">
            {filteredAccountSettings.map((setting, index) => {
              return (
                <Link
                  className={cn(
                    "block px-4 py-2 hover:bg-gray-100 hover:text-gray-900",
                    {
                      "font-medium text-[#6571FF]": path === setting.link,
                    }
                  )}
                  key={index}
                  href={setting.link}
                >
                  {setting.label}
                </Link>
              );
            })}
          </div>
          {permissions &&
            (permissions.role === "Admin" ||
              permissions.role === "Manager") && (
              <div className="sm:block">
                <h3 className="mb-4 font-bold">
                  <span className="border-b-2 pb-1">Business Settings</span>
                </h3>
                <div className="space-y-2">
                  {filteredBusinessSettings.map((setting, index) => {
                      return (
                        <Link
                          className={cn(
                            "block px-4 py-2 hover:bg-gray-100 hover:text-gray-900",
                            {
                              "font-medium text-[#6571FF]":
                                path === setting.link,
                            }
                          )}
                          key={index}
                          href={setting.link}
                        >
                          {setting.label}
                        </Link>
                      );
                    })}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* for desktop view */}
      <div className="sticky top-6 hidden min-h-[80vh] min-w-[300px] max-w-[350px] rounded-2xl bg-background px-6 py-8 shadow-xl lg:block">
        <h3 className="mb-4 font-bold">
          <span className="border-b-2 pb-1">Account Settings</span>
        </h3>
        <div className="mb-8 space-y-2">
          {filteredAccountSettings.map((setting, index) => {
            return (
              <Link
                className={cn(
                  "block px-4 py-2 hover:bg-gray-100 hover:text-gray-900",
                  {
                    "font-medium text-[#6571FF]": path === setting.link,
                  }
                )}
                key={index}
                href={setting.link}
              >
                {setting.label}
              </Link>
            );
          })}
        </div>
        {permissions &&
          (permissions.role === "Admin" || permissions.role === "Manager") && (
            <div>
              <h3 className="mb-4 font-bold">
                <span className="border-b-2 pb-1">Business Settings</span>
              </h3>
              <div className="space-y-2">
                {filteredBusinessSettings.map((setting, index) => {
                  return (
                    <Link
                      className={cn(
                        "block px-4 py-2 hover:bg-gray-100 hover:text-gray-900",
                        {
                          "font-medium text-[#6571FF]": path === setting.link,
                        }
                      )}
                      key={index}
                      href={setting.link}
                    >
                      {setting.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default Sidebar;
