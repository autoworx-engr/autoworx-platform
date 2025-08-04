import { Attachment, BugReport, Company, UserType } from "@prisma/client";

export type TBugReportMessage = {
  id: number;
  bugReportId: number;
  subject?: string | null;
  content: string;
  senderType: UserType;
  companyId?: number | null;
  userId: number;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  bugReport: BugReport;
  attachment: Attachment[];
};
