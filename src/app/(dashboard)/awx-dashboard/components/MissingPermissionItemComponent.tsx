import { StaticPermissionItem } from "@/types/feature-permission";
import { Switch } from "antd";
import { ChevronDown, ChevronRight } from "lucide-react";

interface MissingPermissionItemProps {
  item: StaticPermissionItem;
  level?: number;
  isCreatePending?: boolean;
  expandedItems: Set<string>;
  toggleExpanded: (title: string) => void;
  handleCreateToggle: (item: StaticPermissionItem, checked: boolean) => void;
}

export const MissingPermissionItemComponent = ({
  item,
  level = 0,
  isCreatePending = false,
  expandedItems,
  toggleExpanded,
  handleCreateToggle,
}: MissingPermissionItemProps) => {
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
          <span className="text-sm text-[#66738C]">{item.title}</span>
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(item.title)}
              className="mr-2 rounded p-1 hover:bg-gray-100"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-[#66738C]" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[#66738C]" />
              )}
            </button>
          )}
        </div>
        <Switch
          checked={item.status}
          disabled={isCreatePending}
          onChange={(checked) => handleCreateToggle(item, checked)}
          className="max-w-2 shadow-md"
        />
      </div>

      {hasChildren && isExpanded && (
        <div>
          {item.children!.map((child) => (
            <MissingPermissionItemComponent
              key={child.permission_name}
              item={child}
              level={level + 1}
              isCreatePending={isCreatePending}
              expandedItems={expandedItems}
              toggleExpanded={toggleExpanded}
              handleCreateToggle={handleCreateToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};
