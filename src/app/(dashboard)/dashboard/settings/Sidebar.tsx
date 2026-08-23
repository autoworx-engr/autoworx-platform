"use client";
import { cn } from "@/lib/cn";
import { canAccessRoute, canAccessWithFeatureKey } from "@/lib/routeAccess";
import { resolveRouteFeatureKey } from "@/lib/routePermissionsMap";
import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
import { usePermissionStore } from "@/stores/permissionStore";
import {
  Bell,
  Briefcase,
  CreditCard,
  DollarSign,
  FileText,
  Globe,
  Headset,
  Menu,
  Send,
  Shield,
  Store,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  isLegacy?: boolean;
};

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
    icon: Briefcase,
  },
  {
    link: "/dashboard/settings/networks",
    label: "My Network",
    icon: Users,
  },
  {
    link: "/dashboard/settings/team-management",
    label: "Team Managements",
    icon: Shield,
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
    icon: DollarSign,
  },
  {
    link: "/dashboard/settings/communications",
    label: "Communications Hub",
    icon: Send,
  },
  {
    link: "/dashboard/settings/virtual-shop-configure",
    label: "Virtual Shop Configure",
    icon: Store,
  },
  {
    link: "/dashboard/settings/leadgeneration",
    label: "Lead Capture",
    icon: Globe,
  },
  {
    link: "/dashboard/settings/automation",
    label: "Automation",
    icon: Zap,
  },
  {
    link: "/dashboard/settings/sales-agent",
    label: "Sales Agent",
    icon: Headset,
  },
];

const Sidebar = ({ isLegacy = false }: Props) => {
  const path = usePathname();
  const { permissions } = usePermissionStore();
  const { companyFeaturePermission } = useCompanyFeaturePermissionStore();

  /**
   * Company product entitlements. Virtual Shop Configure, Automation and Sales
   * Agent each resolve to their own feature key (`virtual-shop`, `automation`,
   * `sales-agent`); the rest of the settings area resolves to
   * `businessSettings`, and My Account / Notifications to nothing at all.
   */
  const canAccessCompanyFeatureRoute = (route: string) =>
    canAccessWithFeatureKey(
      resolveRouteFeatureKey(route),
      companyFeaturePermission,
    );

  const filteredAccountSettings = accountSettings.filter((setting) =>
    canAccessCompanyFeatureRoute(setting.link),
  );

  /**
   * Every link is gated by the same route → key lookup the route guard uses,
   * so the sidebar can't disagree with it.
   *
   * This replaced a `canAccessBusinessSettings()` helper that hardcoded
   * "Admin or Manager only" and ignored the permission for everyone else — so
   * granting Business Settings to the Other role hid the links while the URL
   * still worked. Sales and Technician remain excluded automatically: their
   * Prisma models have no `businessSettings` column, so the key reads false.
   */
  const filteredBusinessSettings = businessSettings.filter(
    (setting) =>
      Boolean(permissions) &&
      canAccessCompanyFeatureRoute(setting.link) &&
      canAccessRoute(setting.link, permissions) &&
      !(isLegacy && setting.link === "/dashboard/settings/billing"),
  );

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const NavLink = ({
    setting,
  }: {
    setting: (typeof accountSettings)[0] & { icon: React.ElementType };
  }) => {
    const isActive =
      path === setting.link ||
      path.startsWith(setting.link + "/") ||
      (path === "/dashboard/settings/sales-agent/ai-settings" &&
        setting.link === "/dashboard/settings/sales-agent");
    return (
      <Link
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-200 text-base",
          isActive
            ? "bg-primary text-white font-medium shadow-md shadow-primary/30" // Active link style
            : "text-gray-600 hover:bg-gray-100 hover:text-primary", // Inactive link style
        )}
        key={setting.link}
        href={setting.link}
        onClick={() => setIsSidebarOpen(false)} // Close sidebar on click (for mobile)
      >
        <setting.icon size={20} className={cn({ "text-white": isActive })} />
        <span>{setting.label}</span>
      </Link>
    );
  };

  const SidebarContent = (
    <div className="p-5 space-y-8">
      {/* Account Settings Section */}
      <div className="space-y-4">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">
          Account Settings
        </h3>
        <div className="space-y-1.5">
          {filteredAccountSettings.map((setting) => (
            <NavLink key={setting.link} setting={setting as any} />
          ))}
        </div>
      </div>

      {/* Business Settings Section */}
      {filteredBusinessSettings.length > 0 && (
        <div className="space-y-4">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">
            Business Settings
          </h3>
          <div className="space-y-1.5">
            {filteredBusinessSettings.map((setting) => (
              <NavLink key={setting.link} setting={setting as any} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Mobile Menu Button */}
      <div className="mb-4 flex items-center xl:hidden bg-white p-3 rounded-xl shadow-sm border">
        <button
          className="rounded-lg p-2 text-gray-700 hover:bg-gray-100"
          onClick={toggleSidebar}
        >
          {isSidebarOpen ? (
            <X size={24} strokeWidth={2.5} />
          ) : (
            <Menu size={24} strokeWidth={2.5} />
          )}
        </button>
        <p className="ml-3 font-semibold text-gray-800">Settings Menu</p>
      </div>

      {/* Mobile Sidebar (Fixed/Off-canvas) - Added Glassmorphism here */}
      <div
        ref={sidebarRef}
        className={cn(
          // Base styles for mobile sidebar
          `fixed left-0 top-0 z-40 h-[calc(100vh-64px)] w-64 transform transition-transform duration-300 xl:hidden`,
          // Glassmorphism effect: uses backdrop-filter
          `bg-white backdrop-blur-xl border border-slate-100 shadow-2xl overflow-y-auto`,
          {
            "translate-x-0": isSidebarOpen,
            "-translate-x-full": !isSidebarOpen,
          },
        )}
        style={{ top: "64px" }}
      >
        <div className="p-4 flex items-end justify-end">
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={toggleSidebar}
          >
            <X size={20} />
          </button>
        </div>
        {SidebarContent}
      </div>

      {/* Desktop Sidebar (Sticky) - Added Glassmorphism here */}
      <div
        className={cn(
          "hidden xl:block w-full rounded-2xl p-0 shadow-lg border max-h-[calc(100vh-120px)] overflow-y-auto",
          // Glassmorphism effect for desktop
          "bg-white backdrop-blur-xl border-slate-100",
        )}
      >
        {SidebarContent}
      </div>
    </div>
  );
};

export default Sidebar;
