import { ArrowRight, FileText, FileTextIcon } from "lucide-react";

export const getInvoiceTypeHelp = (type: string) => {
  if (!type) return null;

  const helpContent = {
    Invoice: {
      icon: <FileText className="text-blue-800" />,
      title: "Invoice Automation",
      desc: "Automatically send invoice notifications to clients when an invoice reaches a specific status.",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
    },
    Estimate: {
      icon: <FileTextIcon className="text-purple-800" />,
      title: "Estimate Automation",
      desc: "Automatically send estimate notifications to clients when an estimate reaches a specific status.",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-800",
    },
  };

  return helpContent[type as keyof typeof helpContent] || null;
};


interface ConditionActionHelpProps {
  conditionId?: number | string | null;
  actionId?: number | string | null;
  conditionName?: string;
  actionName?: string;
}

export const getConditionActionHelp = ({
  conditionId,
  actionId,
  conditionName,
  actionName,
}: ConditionActionHelpProps) => {
  if (!conditionId || !actionId) return null;

  const helpConfig = {
    status_transition: {
      icon: <ArrowRight className="w-5 h-5 text-indigo-600" />,
      title: "Status Transition",
      description: `When service moves from "${conditionName}" to "${actionName}", this automation will trigger and send notifications to the customer.`,
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
      textColor: "text-indigo-800",
    },
  };

  return helpConfig.status_transition;
};