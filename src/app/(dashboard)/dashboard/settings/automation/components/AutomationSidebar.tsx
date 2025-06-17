"use client";
import { cn } from "@/lib/cn";

const items = [
  {
    name: "pipeline",
    path: "pipeline",
  },
  {
    name: "communication",
    path: "communication",
  },
  {
    name: "marketing",
    path: "marketing",
  },
  {
    name: "service maintenance",
    path: "service-maintenance",
  },
  {
    name: "invoice",
    path: "invoice",
  },
  {
    name: "inventory",
    path: "inventory",
  },
];

const AutomationSidebar = ({
  type,
  setType,
}: {
  type: string | null;
  setType: any;
}) => {
  const handleClick = (path: string) => () => setType(path);
  return (
    <div className="mx-auto w-full lg:max-w-[700px]">
      <div className="space-y-4">
        {items?.map((item) => {
          const isActive = type == item.path;

          return (
            <div key={item.path} className="">
              <button
                onClick={handleClick(item.path)}
                className={cn(
                  "flex w-full flex-col items-center justify-center text-nowrap rounded-sm border border-gray-200 bg-white px-14 py-4 font-medium capitalize transition-colors",
                  isActive
                    ? "border-blue-500 text-blue-600"
                    : "hover:bg-gray-50",
                )}
              >
                <span className={cn("text-sm", isActive ? "font-medium" : "")}>
                  {item.name}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AutomationSidebar;
