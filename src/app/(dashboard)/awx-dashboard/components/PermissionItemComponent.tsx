import { PermissionItem } from "@/types/feature-permission";
import { Switch } from "antd";
import { ChevronDown, ChevronRight } from "lucide-react";

interface PermissionItemProps {
  item: PermissionItem;
  level?: number;
  isPending?: boolean;
  expandedItems: Set<string>;
  toggleExpanded: (title: string) => void;
  handleToggle: (
    permissionName: string,
    checked: boolean,
    title: string,
    children?: PermissionItem[]
  ) => void;
}

export const PermissionItemComponent = ({
  item,
  level = 0,
  isPending = false,
  expandedItems,
  toggleExpanded,
  handleToggle,
}: PermissionItemProps) => {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.title);

  return (
    <div key={item.permission_name}>
      <div
        className={`flex items-center justify-between rounded-xl border-b border-b-gray-100 py-3 ${
          level > 0 ? "ml-6" : ""
        }`}
      >
        <div className="flex flex-1 items-center pr-4">
          {!hasChildren && level > 0 && <div className="mr-2 w-6" />}

          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(item.title)}
              className="flex mr-2 items-center gap-1 rounded p-1 "
            >
              <span className="text-sm text-[#66738C]">{item.title}</span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-[#66738C]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#66738C]" />
              )}
            </button>
          ) : (
            <span className="text-sm text-[#66738C]">{item.title}</span>
          )}
        </div>
        <Switch
          checked={item.enabled}
          disabled={isPending}
          onChange={(checked) =>
            handleToggle(
              item.permission_name,
              checked,
              item.title,
              item.children
            )
          }
          className="max-w-2 shadow-md"
        />
      </div>

      {hasChildren && isExpanded && (
        <div>
          {item.children!.map((child) => (
            <PermissionItemComponent
              key={child.permission_name}
              item={child}
              level={level + 1}
              isPending={isPending}
              expandedItems={expandedItems}
              toggleExpanded={toggleExpanded}
              handleToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};
