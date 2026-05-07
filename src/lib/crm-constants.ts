/** Alert when on-hand quantity is at or below this (simple restock signal). */
export const LOW_STOCK_THRESHOLD = 5;

import { DealStage, ServiceStage, TicketPriority } from "@prisma/client";

/** All six pipeline stages in display order. */
export const KANBAN_STAGE_ORDER: DealStage[] = [
  DealStage.LEAD,
  DealStage.QUALIFIED,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
  DealStage.WON,
  DealStage.LOST,
];

export const STAGE_LABEL: Record<DealStage, string> = {
  [DealStage.LEAD]: "Lead",
  [DealStage.QUALIFIED]: "Qualified",
  [DealStage.PROPOSAL]: "Proposal",
  [DealStage.NEGOTIATION]: "Negotiation",
  [DealStage.WON]: "Won",
  [DealStage.LOST]: "Lost",
};

/** Service pipeline stage order. */
export const SERVICE_STAGE_ORDER: ServiceStage[] = [
  ServiceStage.ONBOARDING,
  ServiceStage.IN_PROGRESS,
  ServiceStage.UNDER_REVIEW,
  ServiceStage.COMPLETED,
  ServiceStage.CANCELLED,
];

export const SERVICE_STAGE_LABEL: Record<ServiceStage, string> = {
  [ServiceStage.ONBOARDING]: "Onboarding",
  [ServiceStage.IN_PROGRESS]: "In Progress",
  [ServiceStage.UNDER_REVIEW]: "Under Review",
  [ServiceStage.COMPLETED]: "Completed",
  [ServiceStage.CANCELLED]: "Cancelled",
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: "Low",
  [TicketPriority.MEDIUM]: "Medium",
  [TicketPriority.HIGH]: "High",
  [TicketPriority.URGENT]: "Urgent",
};

export const PRIORITY_COLOR: Record<TicketPriority, string> = {
  [TicketPriority.LOW]:    "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  [TicketPriority.MEDIUM]: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  [TicketPriority.HIGH]:   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  [TicketPriority.URGENT]: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};
