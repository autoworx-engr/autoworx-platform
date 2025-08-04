import { CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CircleCheckBig, X } from "lucide-react";
import { ReactNode } from "react";

type ChatHeaderType = "super_admin" | "regular" | "new";

interface ModuleSelectorProps {
  element: ReactNode;
}

interface ChatHeaderProps {
  type: ChatHeaderType;
  selectedContact?: {
    company?: {
      name: string;
      image?: string;
    };
    isResolved?: boolean;
    BugReportMessage?: { subject?: string }[];
  };
  onClose: () => void;
  onResolve?: () => void;
  moduleSelectorProps?: ModuleSelectorProps;
}

export const ChatHeader = ({
  type,
  selectedContact,
  onClose,
  onResolve,
  moduleSelectorProps,
}: ChatHeaderProps) => {
  const isAdmin = type === "super_admin";
  const isNew = type === "new";

  const subject =
    selectedContact?.BugReportMessage?.[
      selectedContact?.BugReportMessage?.length - 1
    ]?.subject || "Bug Report";

  const displayName = isNew
    ? "New bug"
    : selectedContact?.company?.name || "Company";

  const avatarSrc = isNew
    ? "/placeholder.svg"
    : selectedContact?.company?.image || "/placeholder.svg";

  const resolved = selectedContact?.isResolved;

  return (
    <CardHeader className="rounded-t-lg bg-[#006D77] py-4 text-white">
      <div className="flex items-center justify-between">
        {/* Avatar and Title */}
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarSrc} alt={displayName} />
            <AvatarFallback className="bg-white text-xs text-teal-600">
              {displayName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-bold">{isNew ? "New Report" : subject}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Show Resolved/Resolve button only for Admin */}
          {isAdmin &&
            (resolved ? (
              <Button size="sm" className="rounded-2xl bg-teal-600 text-base">
                <CircleCheckBig className="mr-1 rounded-full font-bold" />
                Resolved
              </Button>
            ) : (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve?.();
                }}
                size="sm"
                className="rounded-2xl bg-[#3b8f96] text-base hover:bg-teal-600"
              >
                <CircleCheckBig className="mr-1 rounded-full font-bold" />
                Resolve
              </Button>
            ))}

          <Button
            onClick={onClose}
            size="sm"
            variant="ghost"
            className="rounded-full text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Module Selector shown only for new reports */}
      {isNew && moduleSelectorProps?.element && (
        <div className="mt-4">{moduleSelectorProps.element}</div>
      )}
    </CardHeader>
  );
};
