import { LucideIcon } from "lucide-react";
import React from "react";

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
              <div className="bg-primary/10 p-3 rounded-full">
                <Icon className="w-6 h-6 text-primary" />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <h2 className="text-2xl font-semibold text-gray-600 mb-2">{title}</h2>
        <p className="text-gray-500 mb-4">{description}</p>

        {/* Button */}
        {onAction && (
          <button
            onClick={onAction}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-[#5a67d8] transition"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyCard;
