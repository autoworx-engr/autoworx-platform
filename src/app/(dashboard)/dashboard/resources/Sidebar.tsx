"use client";
import { cn } from "@/lib/cn";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const resources = [
  {
    link: "/dashboard/resources",
    label: "dashboard",
  },
  {
    link: "/dashboard/resources/communication",
    label: "communications hub",
  },
  {
    link: "/dashboard/resources/pipeline",
    label: "pipeline",
  },
  {
    link: "/dashboard/resources/task_management",
    label: "task management",
  },
  // {
  //   link: "/dashboard/resources/reporting",
  //   label: "reporting",
  // },
  {
    link: "/dashboard/resources/estimates_invoices",
    label: "estimates & invoices",
  },
  // {
  //   link: "/dashboard/resources/payments",
  //   label: "payments",
  // },
  {
    link: "/dashboard/resources/inventory",
    label: "inventory",
  },
  // {
  //   link: "/dashboard/resources/directory",
  //   label: "directory",
  // },
  // {
  //   link: "/dashboard/resources/reputation_management",
  //   label: "reputation management",
  // },
  // {
  //   link: "/dashboard/resources/settings",
  //   label: "settings",
  // },
  // {
  //   link: "/dashboard/resources/automation",
  //   label: "automation",
  // },
  // {
  //   link: "/dashboard/resources/lead",
  //   label: "lead capture",
  // },
];

export default function Sidebar() {
  const path = usePathname();

  // mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // Toggle sidebar visibility
  const toggleSidebar = () => setIsSidebarOpen((s) => !s);

  // Close when clicking outside on mobile
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div>
      <div className="block lg:hidden">
        <button className={`ml-5 text-xl`} onClick={toggleSidebar}>
          {isSidebarOpen ? (
            <X size={20} strokeWidth={3} />
          ) : (
            <Menu size={24} strokeWidth={3} />
          )}
        </button>

        <div
          ref={sidebarRef}
          className={cn(
            `fixed left-0 top-0 z-50 mb-14 mt-14 h-full w-[280px] transform overflow-y-auto bg-white px-2 py-8 pb-14 rounded-xl shadow-xl transition-transform duration-300 ease-in-out`,
            {
              "translate-x-0": isSidebarOpen,
              "-translate-x-full": !isSidebarOpen,
              "sm:ml-14 md:ml-14 lg:ml-14": isSidebarOpen, // Margin applied when sidebar is open
              "sm:ml-0 md:ml-0": !isSidebarOpen, // No margin when sidebar is closed
            },
          )}
        >
          <div className="flex items-end justify-end align-middle bg-background">
            <button className="text-end text-xl" onClick={toggleSidebar}>
              {isSidebarOpen ? (
                <X size={20} strokeWidth={3} />
              ) : (
                <Menu size={24} strokeWidth={3} />
              )}
            </button>
          </div>

          <div className="space-y-2">
            {resources.map((r, i) => (
              <Link
                key={i}
                href={r.link}
                className={cn(
                  "block px-4 py-2 hover:bg-gray-100 hover:text-gray-900",
                  `${path === r.link && "font-medium text-primary"}`,
                )}
              >
                {toTitleCase(r.label)}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white sticky top-6 hidden min-h-[80vh] min-w-[300px] max-w-[300px] rounded-2xl px-6 py-8 ml-4 shadow-xl lg:block">
        <div className="space-y-2">
          {resources.map((r, i) => (
            <Link
              key={i}
              href={r.link}
              className={cn(
                "block px-4 py-2 hover:bg-gray-100 hover:text-gray-900 rounded-xl",
                {
                  "font-medium text-primary": path === r.link,
                },
              )}
            >
              {toTitleCase(r.label)}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function toTitleCase(str: string) {
  return str
    .split(" ")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
