import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/Tooltip";
import {
  AlertCircle,
  CircleAlert,
  CircleCheckBig,
  UserRoundX,
} from "lucide-react";
import { useEffect, useRef } from "react";

interface ServiceSelectorProps {
  services: string[] | string;
  completedServices?: string[];
  incompleteServices?: string[];
  unAssignedServices?: string[];
  isServiceDropdownOpen: boolean;
  handleServiceDropdownToggle: () => void;
  type: string;
}

function ServiceSelector({
  services,
  completedServices = [],
  incompleteServices = [],
  unAssignedServices = [],
  isServiceDropdownOpen,
  handleServiceDropdownToggle,
  type,
}: ServiceSelectorProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        handleServiceDropdownToggle();
      }
    };

    if (isServiceDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isServiceDropdownOpen, handleServiceDropdownToggle]);

  const hasServices =
    incompleteServices.length +
      completedServices.length +
      unAssignedServices.length >
    0;
  return (
    <div className="relative mb-2" ref={dropdownRef}>
      <div className="flex gap-2">
        {hasServices && (
          <div
            onClick={handleServiceDropdownToggle}
            className="flex w-[52%] cursor-pointer justify-between rounded-md border border-primary px-2 py-1 text-xs"
            style={{
              visibility: isServiceDropdownOpen ? "hidden" : "visible",
            }}
          >
            <span className="inline-flex w-full justify-between text-primary">
              <span className="text-left">
                {services.length > 0
                  ? `Service 1${services.length > 1 ? "..." : ""}`
                  : "Select a service"}
              </span>
              {services.length > 1 && (
                <span className="text-right">+ {services.length - 1}</span>
              )}
            </span>
          </div>
        )}

        {type === "Shop Pipelines" && (
          <TooltipProvider>
            <div
              className="flex gap-3"
              style={{
                visibility: isServiceDropdownOpen ? "hidden" : "visible",
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex items-center gap-1 text-green-600">
                    <CircleCheckBig size={16} />
                    <span className="absolute -top-1.5 -right-2 text-xs">
                      {completedServices.length}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Complete</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex items-center gap-1 text-yellow-500">
                    <AlertCircle size={16} />
                    <span className="absolute -top-1.5 -right-2 text-xs">
                      {incompleteServices.length}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Incomplete</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex items-center gap-1 text-gray-600">
                    <UserRoundX size={16} />
                    <span className="absolute -top-1.5 -right-2 text-xs">
                      {unAssignedServices.length}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Unassigned</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
      </div>
      {isServiceDropdownOpen && (
        <div className="font-Inter z-10 ml-1 mr-1 rounded-md border border-primary text-primary">
          {/* Completed Services */}
          {completedServices.length > 0 && (
            <>
              {type === "Shop Pipelines" && (
                <p
                  className="flex items-center gap-1 px-2 py-1 font-bold text-[#03A7A2]"
                  onClick={handleServiceDropdownToggle}
                >
                  Complete <CircleCheckBig size={16} strokeWidth={3} />
                </p>
              )}
              {completedServices.map((service, index) => (
                <div
                  key={index}
                  onClick={handleServiceDropdownToggle}
                  className="cursor-pointer px-2 py-1 text-sm hover:bg-gray-200"
                >
                  <span className="text-blue-600">{service}</span>
                </div>
              ))}
            </>
          )}

          {/* Incomplete Services */}
          {incompleteServices.length > 0 && (
            <>
              {type === "Shop Pipelines" && (
                <p
                  className="flex items-center gap-1 px-2 py-1 font-bold text-yellow-500"
                  onClick={handleServiceDropdownToggle}
                >
                  Incomplete <CircleAlert size={16} strokeWidth={3} />
                </p>
              )}
              {incompleteServices.map((service, index) => (
                <div
                  key={index}
                  onClick={handleServiceDropdownToggle}
                  className="cursor-pointer px-2 py-1 text-sm hover:bg-gray-200"
                >
                  <span className="text-blue-600">{service}</span>
                </div>
              ))}
            </>
          )}

          {/* unassigned technician Services */}
          {unAssignedServices.length > 0 && (
            <>
              {type === "Shop Pipelines" && (
                <p
                  className="flex items-center gap-1 px-2 py-1 font-bold text-gray-600"
                  onClick={handleServiceDropdownToggle}
                >
                  Unassigned <UserRoundX size={15} strokeWidth={3} />
                </p>
              )}
              {unAssignedServices.map((service, index) => (
                <div
                  key={index}
                  onClick={handleServiceDropdownToggle}
                  className="cursor-pointer px-2 py-1 text-sm hover:bg-gray-200"
                >
                  <span className="text-blue-600">{service}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ServiceSelector;
