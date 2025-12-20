import { Tooltip } from "antd";
import { InfoCircleOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { Target, MessageSquare, Clock, Info, X, Zap } from "lucide-react";
import { useState } from "react";

/**
 * Returns condition-specific help content with icons and styling
 */
export const getConditionHelp = (conditionType: string) => {
  const helpConfig = {
    pipeline: {
      icon: <Target className="w-5 h-5 text-blue-600" />,
      title: "Pipeline Movement",
      desc: "When a tag is added, the lead will automatically move to your selected column.",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-400",
      textColor: "text-blue-900",
    },
    communication: {
      icon: <MessageSquare className="w-5 h-5 text-green-600" />,
      title: "Communication Trigger",
      desc: "When a tag is added, an automatic SMS/Email will be sent to the client.",
      bgColor: "bg-green-50",
      borderColor: "border-green-400",
      textColor: "text-green-900",
    },
    post_tag: {
      icon: <Clock className="w-5 h-5 text-purple-600" />,
      title: "Post-Tag Action",
      desc: "After reaching the targeted column, new tags will be automatically added.",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-400",
      textColor: "text-purple-900",
    },
  };

  return helpConfig[conditionType as keyof typeof helpConfig] || null;
};

/**
 * Renders an info card with icon, title, and description
 */

/**
 * Renders a guide card with dismissible close button
 */
export const GuideCard = ({ onClose }: { onClose: () => void }) => (
  <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
    <div className="flex items-start justify-between">
      <div className="flex gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">How does it work?</p>
          <p className="text-xs leading-relaxed">
            Select Condition → Add Tags → Set Time Delay → Action will be
            triggered
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-blue-600 hover:text-blue-800 transition-colors p-1"
        aria-label="Close guide"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);

/**
 * Renders automation flow visualization
 */
const FlowVisualization = ({
  timeDelay,
  conditionType,
}: {
  timeDelay: string | number | null;
  conditionType: string;
}) => {
  const getActionText = () => {
    switch (conditionType) {
      case "pipeline":
        return "Move to Column";
      case "communication":
        return "Send Message";
      case "post_tag":
        return "Add New Tags";
      default:
        return "Action";
    }
  };

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          Automation Flow Preview
        </h3>
        <Tooltip title="This shows how your automation will work step by step">
          <InfoCircleOutlined className="text-gray-400 hover:text-gray-600 cursor-help" />
        </Tooltip>
      </div>
      <div className="flex items-center gap-2 text-xs overflow-x-auto pb-2">
        <div className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded font-medium whitespace-nowrap">
          Tag Added
        </div>
        <div className="text-gray-400">→</div>
        <div className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded font-medium whitespace-nowrap">
          Wait {timeDelay || "..."}
        </div>
        <div className="text-gray-400">→</div>
        <div className="px-3 py-1.5 bg-green-100 text-green-800 rounded font-medium whitespace-nowrap">
          {getActionText()}
        </div>
      </div>
    </div>
  );
};

/**
 * Renders a helpful tip box
 */
export const TipBox = ({
  message,
  variant = "info",
}: {
  message: string;
  variant?: "info" | "warning" | "success";
}) => {
  const variants = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-900",
      emoji: "💡",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-900",
      emoji: "⚠️",
    },
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-900",
      emoji: "✅",
    },
  };

  const style = variants[variant];
  return (
    <div
      className={`flex items-start gap-2 mt-2 p-2 ${style.bg} border ${style.border} rounded`}
    >
      <span className="text-base">{style.emoji}</span>
      <p className={`text-xs ${style.text}`}>
        <strong>Tip:</strong> {message}
      </p>
    </div>
  );
};
