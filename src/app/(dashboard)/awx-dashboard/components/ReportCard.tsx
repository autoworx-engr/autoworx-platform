import moment from "moment";
import React from "react";
import { Button } from "@/components/ui/button";
import { useBugReportAdminStore } from "@/stores/bugReportAdminStore";

interface BugReportMessage {
  subject?: string | null;
  content?: string | null;
}

export interface BugReport {
  id: string | number;
  createdAt: string | Date;
  BugReportMessage?: BugReportMessage[];
}

type ReportCardProps = {
  report: BugReport;
};

const ReportCard = ({ report }: ReportCardProps) => {
  const { setSelectedContact } = useBugReportAdminStore();

  const ViewButton = () => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setSelectedContact(report);
      }}
      className="rounded-xl  mr-8 md:mr-2 bg-gradient-to-r from-primary to-[#5a66ee]
                shadow-[0_4px_14px_0_rgba(101,113,255,0.39)]
                hover:shadow-[0_6px_20px_rgba(101,113,255,0.23)]
                hover:-translate-y-0.5
                active:translate-y-0 active:scale-100
                transition-all duration-300 ease-in-out px-4 py-1.5 text-sm font-medium text-white"
    >
      View
    </button>
  );
  return (
    <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm p-4 transition-all duration-300 hover:shadow-lg hover:shadow-slate-300/50 dark:hover:shadow-slate-900/50 hover:ring-2 hover:ring-primary/20 hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0 flex-1 ">
          {/* Report Subject */}
          <p className="mb-1  font-bold text-slate-700 dark:text-slate-200 truncate max-w-full">
            {
              report?.BugReportMessage?.[report?.BugReportMessage?.length - 1]
                ?.subject
            }
          </p>

          {/* Date */}
          <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {moment(report?.createdAt).format("DD MMMM YYYY")}
          </div>
          {/* Content Snippet */}
          <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <p>
              {(() => {
                const lastMsg =
                  report.BugReportMessage?.[report.BugReportMessage.length - 1];
                const content = lastMsg?.content ?? "";
                return content.length > 80
                  ? `${content.slice(0, 80)}...`
                  : content;
              })()}
            </p>
          </div>
        </div>
      </div>
      {/* Primary accent color bar for visual hierarchy and importance */}
      <div className="absolute right-0 top-1/2 h-[90%] w-1 -translate-y-1/2 rounded-l-3xl bg-gradient-to-r from-primary to-[#5a66ee]"></div>
      <div className="shrink-0 pt-0.5">
        <ViewButton />
      </div>
    </div>
  );
};

export default ReportCard;
