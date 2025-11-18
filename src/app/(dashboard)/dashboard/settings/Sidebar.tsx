"use client";
import { cn } from "@/lib/cn";
import { usePermissionStore } from "@/stores/permissionStore";
import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
import { FEATURE_PERMISSIONS_MAP } from "@/lib/routePermissionsMap";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, Building2, ChevronRight, CreditCard, FileText, Menu, MessageSquare, Network, Sparkles, User, Users, Wallet, X, Zap } from "lucide-react";

type Props = {};

const accountSettings = [
  {
    link: "/dashboard/settings/my-account",
    label: "My Account",
    icon: User,
  },
  {
    link: "/dashboard/settings/notifications",
    label: "Notifications",
    icon: Bell,
  },
];

const businessSettings = [
  {
    link: "/dashboard/settings/business",
    label: "Business Profile",
    icon: Building2,
  },
  {
    link: "/dashboard/settings/networks",
    label: "My Network",
    icon: Network,
  },
  {
    link: "/dashboard/settings/team-management",
    label: "Team Management",
    icon: Users,
  },
  {
    link: "/dashboard/settings/payments",
    label: "Payments",
    icon: CreditCard,
  },
  {
    link: "/dashboard/settings/estimates",
    label: "Estimates & Invoice",
    icon: FileText,
  },
  {
    link: "/dashboard/settings/billing",
    label: "Billing",
    icon: Wallet,
  },
  {
    link: "/dashboard/settings/communications",
    label: "Communications Hub",
    icon: MessageSquare,
  },
  {
    link: "/dashboard/settings/leadgeneration",
    label: "Lead Capture",
    icon: Sparkles,
  },
  {
    link: "/dashboard/settings/automation",
    label: "Automation",
    icon: Zap,
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
      return featureKey.some((key) =>
        companyFeaturePermission.some(
          (perm) => perm.permission_name === key && perm.enabled
        )
      );
    }
    return companyFeaturePermission.some(
      (perm) => perm.permission_name === featureKey && perm.enabled
    );
  }

  // Helper: Check if user has individual permission for business settings
  function canAccessBusinessSettings(): boolean {
    if (!permissions) return false;

    // Admin always has access
    if (permissions.role === "Admin") return true;

    // For managers, check if they have businessSettings permission
    if (permissions.role === "Manager") {
      // Check company permission first
      //@ts-ignore
      const hasCompanyPermission = Boolean(
        permissions.companyPermissions?.businessSettings
      );
      if (!hasCompanyPermission) return false;

      // If company allows it, check user permission
      if (permissions.userPermissions) {
        //@ts-ignore
        return Boolean(permissions.userPermissions?.businessSettings);
      }

      // If no user permissions defined, assume company permission is enough
      return hasCompanyPermission;
    }

    // Other roles don't have access
    return false;
  }

  const filteredAccountSettings = accountSettings.filter((setting) =>
    canAccessCompanyFeatureRoute(setting.link)
  );
  const filteredBusinessSettings = businessSettings.filter(
    (setting) =>
      canAccessCompanyFeatureRoute(setting.link) && canAccessBusinessSettings()
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
      {/* Mobile Menu Button */}
      <div className="block lg:hidden">
        <button 
          className="ml-5 p-2 rounded-lg hover:bg-slate-100 transition-colors duration-300" 
          onClick={toggleSidebar}
        >
          {isSidebarOpen ? (
            <X size={20} strokeWidth={2.5} />
          ) : (
            <Menu size={24} strokeWidth={2.5} />
          )}
        </button>

        {/* Mobile Sidebar */}
        <div
          ref={sidebarRef}
          className={cn(
            "fixed left-0 top-0 z-50 h-full w-[280px] transform overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-in-out",
            {
              "translate-x-0": isSidebarOpen,
              "-translate-x-full": !isSidebarOpen,
            }
          )}
        >
          <div className="flex items-end justify-end p-4">
            <button 
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors duration-300" 
              onClick={toggleSidebar}
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>

          <div className="px-4 pb-8">
            {/* Account Section */}
            <div className="mb-6">
              <h3 className="mb-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Account
              </h3>
              <div className="space-y-1">
                {filteredAccountSettings.map((setting, index) => {
                  const Icon = setting.icon;
                  const isActive = path === setting.link;
                  return (
                    <Link
                      key={index}
                      href={setting.link}
                      onClick={() => setIsSidebarOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-300 group",
                        {
                          "bg-slate-900 text-white shadow-lg": isActive,
                          "text-slate-700 hover:bg-slate-100": !isActive,
                        }
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} strokeWidth={2} />
                        <span className="font-medium text-sm">{setting.label}</span>
                      </div>
                      {isActive && <ChevronRight size={16} strokeWidth={2.5} />}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Business Section */}
            {canAccessBusinessSettings() && filteredBusinessSettings.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Business
                </h3>
                <div className="space-y-1">
                  {filteredBusinessSettings.map((setting, index) => {
                    const Icon = setting.icon;
                    const isActive = path === setting.link;
                    return (
                      <Link
                        key={index}
                        href={setting.link}
                        onClick={() => setIsSidebarOpen(false)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-300 group",
                          {
                            "bg-slate-900 text-white shadow-lg": isActive,
                            "text-slate-700 hover:bg-slate-100": !isActive,
                          }
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={18} strokeWidth={2} />
                          <span className="font-medium text-sm">{setting.label}</span>
                        </div>
                        {isActive && <ChevronRight size={16} strokeWidth={2.5} />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="sticky top-6 hidden min-h-[80vh] min-w-[300px] max-w-[320px] rounded-2xl bg-white shadow-lg ring-1 ring-slate-900/5 px-5 py-6 lg:block">
        {/* Account Section */}
        <div className="mb-8">
          <h3 className="mb-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Account
          </h3>
          <div className="space-y-1">
            {filteredAccountSettings.map((setting, index) => {
              const Icon = setting.icon;
              const isActive = path === setting.link;
              return (
                <Link
                  key={index}
                  href={setting.link}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-300 group",
                    {
                      "bg-slate-900 text-white shadow-lg": isActive,
                      "text-slate-700 hover:bg-slate-100": !isActive,
                    }
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} strokeWidth={2} />
                    <span className="font-medium text-sm">{setting.label}</span>
                  </div>
                  {isActive && <ChevronRight size={16} strokeWidth={2.5} />}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Business Section */}
        {permissions &&
          (permissions.role === "Admin" || permissions.role === "Manager") &&
          filteredBusinessSettings.length > 0 && (
            <div>
              <h3 className="mb-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Business
              </h3>
              <div className="space-y-1">
                {filteredBusinessSettings.map((setting, index) => {
                  const Icon = setting.icon;
                  const isActive = path === setting.link;
                  return (
                    <Link
                      key={index}
                      href={setting.link}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-300 group",
                        {
                          "bg-slate-900 text-white shadow-lg": isActive,
                          "text-slate-700 hover:bg-slate-100": !isActive,
                        }
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} strokeWidth={2} />
                        <span className="font-medium text-sm">{setting.label}</span>
                      </div>
                      {isActive && <ChevronRight size={16} strokeWidth={2.5} />}
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
