import { FileText, FileTextIcon } from "lucide-react";

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
