import { TNotification } from "@/types/notification";
import {
  PermissionForOther,
  PermissionForSales,
  PermissionForTechnician,
} from "@prisma/client";

import { PermissionsResult } from "@/lib/getPermissions";

// notification permissions for sales
export function checkPermissionForSales(
  companyPermission: PermissionForSales | null,
  notification: Partial<TNotification> | null,
) {
  const notificationForSales: Partial<TNotification> = {};
  if (companyPermission?.salesPipeline) {
    notificationForSales.leads = notification?.leads;
  }
  if (
    companyPermission?.communicationHubClients ||
    companyPermission?.communicationHubInternal ||
    companyPermission?.communicationHubCollaboration
  ) {
    notificationForSales.communication = notification?.communication;
  }
  if (companyPermission?.calendarTask) {
    notificationForSales.task = notification?.task;
  }
  if (companyPermission?.estimatesInvoices) {
    notificationForSales.estimate = notification?.estimate;
  }
  if (companyPermission?.payments) {
    notificationForSales.payments = notification?.payments;
  }
  return notificationForSales;
}

// notification permissions for technician
export function checkPermissionForTechnician(
  companyPermission: PermissionForTechnician | null,
  notification: Partial<TNotification> | null,
) {
  const notificationForTechnician: Partial<TNotification> = {};
  if (companyPermission?.calendarTask) {
    notificationForTechnician.task = notification?.task;
  }
  if (companyPermission?.communicationHubInternal) {
    notificationForTechnician.communication = {
      internalMessageAlert: notification?.communication?.internalMessageAlert,
    };
  }
  return notificationForTechnician;
}

// notification permissions for other
export function checkPermissionForOther(
  companyPermission: PermissionForOther | null,
  notification: Partial<TNotification> | null,
) {}

// get notification data
export function getNotificationByRole(
  notification: Partial<TNotification> | null,
  permissions: PermissionsResult | null,
): Partial<TNotification | null> {
  switch (permissions?.role) {
    case "Sales":
      const notificationPermissionsForSales = checkPermissionForSales(
        permissions?.companyPermissions,
        notification,
      );
      return notificationPermissionsForSales;

    case "Technician":
      const notificationPermissionsForTechnician = checkPermissionForTechnician(
        permissions?.companyPermissions,
        notification,
      );
      return notificationPermissionsForTechnician;

    case "Other":
      return notification;
    default:
      return notification;
  }
}

// get notification title for each service
export function getNotificationTitle(category: string) {
  return category.split("_").join(" ").toLocaleLowerCase();
}
