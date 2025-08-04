import moment from "moment";
import React from "react";
import { Button } from "@/components/ui/button";
import { useBugReportAdminStore } from "@/stores/bugReportAdminStore";

type ReportCardProps = {
  report: any;
};

const ReportCard = ({ report }: ReportCardProps) => {
  const { setSelectedContact } = useBugReportAdminStore();
  return (
    <div className="relative rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-6">
        <div className="max-w-2/4 flex-1 text-[#66738C]">
          <div className="flex justify-between items-center gap-3">
            <p className="mb-1 w-full font-bold">
              {
                report?.BugReportMessage?.[report?.BugReportMessage?.length - 1]
                  ?.subject
              }
            </p>
            <Button
              size="sm"
              onClick={() => setSelectedContact(report)}
              className="rounded mr-2 bg-[#6571FF] px-4 py-1 text-sm font-medium text-white hover:bg-[#6571FF]/90"
            >
              View
            </Button>
          </div>
          <div className="mb-2 text-sm font-semibold">
            {moment(report?.createdAt).format("DD MMMM YYYY")}
          </div>
          <div className="text-sm leading-relaxed">
            <p>
              {report.BugReportMessage?.[report?.BugReportMessage?.length - 1]
                ?.content.length > 80
                ? `${report.BugReportMessage?.[
                    report?.BugReportMessage?.length - 1
                  ]?.content.slice(0, 80)}...`
                : report.BugReportMessage?.[
                    report?.BugReportMessage?.length - 1
                  ]?.content}
            </p>
          </div>
        </div>
      </div>
      <div className="absolute right-1 top-1/2 h-[90%] w-1 -translate-y-1/2 rounded-3xl bg-[#6571FF]"></div>
    </div>
  );
};

export default ReportCard;
