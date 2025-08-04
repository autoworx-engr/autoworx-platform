import { useState } from "react";
import { NavItem } from "./docsNavigation";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";

interface SidebarNavItemProps {
  item: NavItem;
  isActive?: boolean;
  depth?: number;
  onClick?: () => void;
}

const SidebarNavItem = ({
  item,
  isActive = false,
  depth = 0,
  onClick,
}: SidebarNavItemProps) => {
  const [isExpanded, setIsExpanded] = useState(item.isExpanded || isActive);
  const hasChildren = !!item.children?.length;
  const Icon = item.icon;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    if (onClick) {
      onClick();
    }
  };

  const paddingLeft = depth === 0 ? "px-3" : `pl-${depth * 3 + 3} pr-3`;

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex cursor-pointer items-center justify-between rounded-md py-2",
          paddingLeft,
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
          hasChildren && "mb-1",
        )}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" />}
          {hasChildren ? (
            <span>{item.title}</span>
          ) : (
            <Link href={item.href} className="flex w-full">
              {item.title}
            </Link>
          )}
        </div>
        {hasChildren &&
          (isExpanded ? (
            <LuChevronDown className="h-4 w-4" />
          ) : (
            <LuChevronRight className="h-4 w-4" />
          ))}
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {item?.children?.map((child, index) => (
            <SidebarNavItem
              key={index}
              item={child}
              depth={depth + 1}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SidebarNavItem;
