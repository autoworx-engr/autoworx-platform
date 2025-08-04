import { cn } from "@/lib/utils";
import React, { useEffect } from "react";
import { LuLaptop } from "react-icons/lu";
import { useIsMobile } from "../hooks/use-mobile";
import { docsNavigation } from "./docsNavigation";
import SidebarGroup from "./SidebarGroup";

interface DocSidebarProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DocSidebar = ({ isOpen, setIsOpen }: DocSidebarProps) => {
  const isMobile = useIsMobile();

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isMobile && isOpen) {
        const sidebarEl = document.getElementById("doc-sidebar");
        if (sidebarEl && !sidebarEl.contains(e.target as Node)) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isMobile, isOpen, setIsOpen]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile) {
      if (isOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "auto";
      }
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobile, isOpen]);

  const handleItemClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="doc-sidebar"
        className={cn(
          "bg-sidebar scrollbar-none h-[calc(100vh-4rem)] overflow-y-auto pb-12 transition-all duration-300",
          isMobile
            ? "fixed bottom-0 top-16 z-50 w-3/4 max-w-xs border-r"
            : "sticky top-16 w-64 border-r",
          isMobile && !isOpen ? "-translate-x-full" : "translate-x-0",
        )}
      >
        <div className="px-3 py-6">
          <div className="mb-6 flex items-center px-3">
            <LuLaptop className="text-sidebar-primary mr-2 h-6 w-6" />
            <h2 className="text-sidebar-foreground text-lg font-bold">
              DocGlide
            </h2>
          </div>

          <div className="space-y-1">
            <SidebarGroup
              items={docsNavigation}
              onItemClick={handleItemClick}
            />
          </div>
        </div>
      </aside>
    </>
  );
};

export default DocSidebar;
