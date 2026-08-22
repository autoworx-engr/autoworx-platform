import { Company } from "@prisma/client";
import { TBugReportMessage } from "./BugReportMessage";

export type TBugReport = {
  id: number;
  companyId: number;
  isResolved: boolean;
  company: Company;
};
