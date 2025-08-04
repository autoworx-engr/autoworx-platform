import React from "react";
import SidebarNavItem from "./SidebarNavItem";
import { NavItem } from "./docsNavigation";

interface SidebarGroupProps {
  items: NavItem[];
  title?: string;
  onItemClick?: () => void;
}

const SidebarGroup = ({ items, title, onItemClick }: SidebarGroupProps) => {
  return (
    <div className="mb-6">
      {title && (
        <h3 className="text-sidebar-foreground/70 mb-2 px-3 text-xs font-semibold uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="space-y-1">
        {items.map((item, index) => (
          <SidebarNavItem key={index} item={item} onClick={onItemClick} />
        ))}
      </div>
    </div>
  );
};

export default SidebarGroup;
