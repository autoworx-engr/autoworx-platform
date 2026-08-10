import {
  AlertTriangle,
  Mail,
  MessageSquare,
  Package,
  RefreshCw,
  Users,
} from "lucide-react";

export const getInventoryConditionHelp = (conditionType: string) => {
  const helpConfig = {
    "Low Stock": {
      icon: <Package className="w-5 h-5 text-orange-600" />,
      title: "Low Stock Alert",
      desc: "When product stock falls below the threshold, automatic notifications will be sent to your team.",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-400",
      textColor: "text-orange-900",
    },
    "Out of Stock": {
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
      title: "Out of Stock Alert",
      desc: "When a product is completely out of stock, immediate notifications will be sent to reorder.",
      bgColor: "bg-red-50",
      borderColor: "border-red-400",
      textColor: "text-red-900",
    },
    Both: {
      icon: <RefreshCw className="w-5 h-5 text-purple-600" />,
      title: "Combined Stock Alerts",
      desc: "Monitor both low stock and out of stock situations. Team will be notified for both conditions.",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-400",
      textColor: "text-purple-900",
    },
  };

  return helpConfig[conditionType as keyof typeof helpConfig] || null;
};

export const getInventoryActionHelp = (
  actionId: string,
  isReporting?: boolean,
) => {
  const actionConfig = {
    EMAIL: {
      icon: <Mail className="w-5 h-5 text-blue-600" />,
      title: "Email Notification",
      desc: `Selected team members will receive an email with ${isReporting ? "reporting" : "re-order"} list details.`,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-400",
      textColor: "text-blue-900",
    },
    SMS: {
      icon: <MessageSquare className="w-5 h-5 text-green-600" />,
      title: "SMS Notification",
      desc: `Selected team members will receive an SMS with ${isReporting ? "reporting list details." : "stock levels."} .`,
      bgColor: "bg-green-50",
      borderColor: "border-green-400",
      textColor: "text-green-900",
    },
    BOTH: {
      icon: <Users className="w-5 h-5 text-indigo-600" />,
      title: "Email & SMS Notification",
      desc: `Team members will receive both email and SMS for immediate attention to ${isReporting ? "reporting." : "stock issues."} issues.`,
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-400",
      textColor: "text-indigo-900",
    },
  };

  return actionConfig[actionId as keyof typeof actionConfig] || null;
};
