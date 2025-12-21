import { Tooltip } from "antd";
import { InfoCircleOutlined, QuestionCircleOutlined } from "@ant-design/icons";
const TooltipLabel = ({
  label,
  tooltipText,
  required = false,
  icon = "info",
}: {
  label: string;
  tooltipText: string | React.ReactNode;
  required?: boolean;
  icon?: "info" | "question";
}) => {
  const IconComponent =
    icon === "question" ? QuestionCircleOutlined : InfoCircleOutlined;

  return (
    <div className="flex items-center gap-1 mb-1">
      <span className="font-medium text-gray-500">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <Tooltip title={tooltipText} placement="top">
        <IconComponent className="text-gray-400 hover:text-gray-600 cursor-help text-xs" />
      </Tooltip>
    </div>
  );
};

export default TooltipLabel;