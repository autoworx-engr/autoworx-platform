import ReportNotFoundCard from "@/app/(dashboard)/awx-dashboard/components/ReportNotFoundCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Dispatch, SetStateAction } from "react";

interface BugReportDropdownCardProps {
  isAdmin?: boolean;
  isLoading?: boolean;
  bugReports: any[];
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  onNew?: () => void;
  showNewButton?: boolean;
  onContactSelect: (contact: any) => void;
}

export const BugReportDropdownCard = ({
  isAdmin = false,
  isLoading = false,
  bugReports = [],
  searchQuery,
  setSearchQuery,
  onNew,
  showNewButton = false,
  onContactSelect,
}: BugReportDropdownCardProps) => {
  return (
    <Card className="custom-scrollbar absolute top-0 right-10 md:right-32 z-30 w-72 sm:w-80 max-h-80 overflow-y-auto shadow-xl">
      {/* Header */}
      <CardHeader
        className={`pb-2 ${!isAdmin ? "flex flex-col gap-2 md:flex-row md:items-center md:justify-between" : ""}`}
      >
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            type="text"
            placeholder={isAdmin ? "Search..." : "Search bugs..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-md py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none ${
              isAdmin ? "border-[#66738C]" : "border border-gray-300"
            }`}
          />
        </div>

        {!isAdmin && showNewButton && (
          <div className="w-full md:w-auto">
            <button
              onClick={onNew}
              className="-mt-2 w-full rounded-md bg-primary px-4 py-[7px] text-sm font-medium text-white transition hover:bg-blue-600 md:w-auto"
            >
              New
            </button>
          </div>
        )}
      </CardHeader>

      {/* Loading State */}
      {isLoading ? (
        [1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="my-2 flex h-8 w-full animate-pulse items-center justify-center rounded-md bg-gray-200 p-4 shadow-sm md:p-6"
          ></div>
        ))
      ) : bugReports.length > 0 ? (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {bugReports?.map((contact: any) => {
              const subjectMsg =
                contact.BugReportMessage?.[contact.BugReportMessage.length - 1];
              const subject =
                subjectMsg?.subject?.slice(0, 100) || "No subject";

              return (
                <div
                  key={contact.id}
                  onClick={() => onContactSelect(contact)}
                  className="flex cursor-pointer items-center space-x-3 rounded-lg border p-2 transition-colors hover:bg-gray-100"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={contact.company.image || "/placeholder.svg"}
                      alt={contact.company.name}
                    />
                    <AvatarFallback>
                      {contact.company.name
                        .split(" ")
                        .map((n: any) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-[#797979]">
                    <div
                      className={`${isAdmin ? "text-lg" : "text-sm"} font-bold`}
                    >
                      {subject}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      ) : (
        <div className="px-2">
          <ReportNotFoundCard />
        </div>
      )}
    </Card>
  );
};
