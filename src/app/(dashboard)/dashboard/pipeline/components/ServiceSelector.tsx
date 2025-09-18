import { useEffect, useRef } from "react";
import { IoIosCheckmarkCircleOutline } from "react-icons/io";
import { MdErrorOutline } from "react-icons/md";
import { RiUserUnfollowLine } from "react-icons/ri";

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
            className="flex w-[60%] cursor-pointer justify-between rounded-md border border-[#6571FF] px-2 py-1 text-xs"
            style={{
              visibility: isServiceDropdownOpen ? "hidden" : "visible",
            }}
          >
            <span className="inline-flex w-full justify-between text-[#6571FF]">
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
          <div
            className="flex gap-1"
            style={{
              visibility: isServiceDropdownOpen ? "hidden" : "visible",
            }}
          >
            <div className="flex items-center gap-1 text-green-600">
              <IoIosCheckmarkCircleOutline />
              <span>{completedServices.length}</span>
            </div>
            <div className="flex items-center gap-1 text-yellow-500">
              <MdErrorOutline />
              <span>{incompleteServices.length}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <RiUserUnfollowLine size={15} />
              <span>{unAssignedServices.length}</span>
            </div>
          </div>
        )}
      </div>
      {isServiceDropdownOpen && (
        <div className="font-Inter z-10 ml-1 mr-1 rounded-md border border-[#6571FF] text-[#6571FF]">
          {/* Completed Services */}
          {completedServices.length > 0 && (
            <>
              {type === "Shop Pipelines" && (
                <p
                  className="flex items-center gap-1 px-2 py-1 font-bold text-[#03A7A2]"
                  onClick={handleServiceDropdownToggle}
                >
                  Complete <IoIosCheckmarkCircleOutline />
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
                  Incomplete <MdErrorOutline />
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
                  Unassigned <RiUserUnfollowLine size={15} />
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
