import React from "react";
import { LucideIcon } from "lucide-react";

type EmptyCardProps = {
  title?: string;
  Icon: LucideIcon;
  description?: string;
  actionText?: string;
  onAction?: () => void;
};

const EmptyCard: React.FC<EmptyCardProps> = ({
  Icon,
  title = "No Shop Configured",
  description = "You haven’t set up your shop yet. Start by creating one.",
  actionText = "Create Shop",
  onAction,
}) => {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="bg-white rounded-lg p-6 text-center w-full ">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          {Icon && (
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Icon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-500 mb-4">{description}</p>

        {/* Button */}
        {onAction && (
          <button
            onClick={onAction}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyCard;
