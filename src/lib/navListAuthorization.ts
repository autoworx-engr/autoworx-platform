import { ReactNode } from "react";
import { PermissionsResult } from "@/lib/getPermissions";

type BasePermission = {
  id: number;
  companyId: number;
  communicationHubInternal?: boolean;
  communicationHubClients?: boolean;
  communicationHubCollaboration?: boolean;
  calendarTask?: boolean;
  shopPipeline?: boolean;
  salesPipeline?: boolean;
  reporting?: boolean;
  reportingViewOnly?: boolean;
  estimatesInvoices?: boolean;
  payments?: boolean;
  inventory?: boolean;
  inventoryAll?: boolean; // Added for Manager permissions
  inventoryAllViewOnly?: boolean;
  workforceManagement?: boolean;
  workforceManagementViewOnly?: boolean;
  businessSettings?: boolean;
  // Add any other keys as needed
};

type NavItem = {
  title: string;
  icon: string | ReactNode;
  link?: string | null;
  path: string;
  subnav?:
    | {
        title: string;
        link: string;
      }[]
    | null;
};

export function filterNavList(
  navList: NavItem[],
  permissions: PermissionsResult | null,
): NavItem[] {
  return navList
    .filter((item) => {
      // Role-based filtering
      if (permissions?.role === "Technician") {
        if (
          [
            "Invoices",
            "Payments",
            "Directory",
            "Inventory",
            "Visualization",
          ].includes(item.title)
        ) {
          return false;
        }
      }
      if (permissions?.role === "Sales") {
        if (["Visualization"].includes(item.title)) {
          return false;
        }
      }
      // Permission-based checks
      if (permissions?.companyPermissions) {
        const cp = permissions.companyPermissions as BasePermission;
        const up = permissions.userPermissions as BasePermission | undefined;

        const check = <K extends keyof BasePermission>(
          companyKey: K,
          userKey?: K,
        ) => {
          if (!cp[companyKey]) return false;
          if (!up || userKey === undefined) return true;
          return !!up[userKey];
        };

        switch (item.title) {
          case "Communication Hub":
            return (
              check("communicationHubClients", "communicationHubClients") ||
              check("communicationHubInternal", "communicationHubInternal") ||
              check(
                "communicationHubCollaboration",
                "communicationHubCollaboration",
              )
            );

          case "Task and Activity Management":
            return check("calendarTask", "calendarTask");

          case "Pipelines":
            return (
              check("shopPipeline", "shopPipeline") ||
              check("salesPipeline", "salesPipeline")
            );

          case "Analytics and Reporting":
            return (
              check("reporting", "reporting") ||
              check("reportingViewOnly", "reportingViewOnly")
            );

          case "Invoices":
            return check("estimatesInvoices", "estimatesInvoices");

          case "Payments":
            return check("payments", "payments");

          case "Inventory":
            return (
              check("inventory", "inventory") ||
              check("inventoryAll", "inventoryAll") ||
              check("inventoryAllViewOnly", "inventoryAllViewOnly")
            );

          case "Directory":
            return (
              check("workforceManagement", "workforceManagement") ||
              check(
                "workforceManagementViewOnly",
                "workforceManagementViewOnly",
              )
            );

          default:
            return true;
        }
      }

      return true;
    })
    .map((item) => {
      if (permissions?.role === "Technician") {
        if (item.title === "Communication Hub") {
          return {
            ...item,
            subnav:
              item.subnav?.filter(
                (subnavItem) => subnavItem.title === "Internal",
              ) || null,
          };
        }
        if (item.title === "Pipelines") {
          return {
            ...item,
            link: "/dashboard/pipeline/shop/pipeline",
          };
        }
        if (item.title === "Analytics and Reporting") {
          return {
            ...item,
            link: "/dashboard/reporting/technicianreporting",
          };
        }
      }
      if (permissions?.role === "Sales") {
        if (item.title === "Pipelines") {
          return item;
        }
        if (item.title === "Inventory") {
          return {
            ...item,
            subnav:
              item.subnav?.filter(
                (subnavItem) => subnavItem.title === "Inventory List",
              ) || null,
          };
        }
        if (item.title === "Directory") {
          return {
            ...item,
            subnav:
              item.subnav?.filter(
                (subnavItem) => subnavItem.title === "Client",
              ) || null,
          };
        }
        if (item.title === "Analytics and Reporting") {
          return {
            ...item,
            link: "/dashboard/reporting/salesreporting",
          };
        }
      }
      if (permissions?.role === "Other") {
        if (item.title === "Directory") {
          return {
            ...item,
            subnav:
              item.subnav?.filter(
                (subnavItem) => subnavItem.title !== "Employee",
              ) || null,
          };
        }
        if (item.title === "Inventory") {
          return {
            ...item,
            subnav:
              item.subnav?.filter(
                (subnavItem) => subnavItem.title === "Vendor List",
              ) || null,
          };
        }
      }
      // Permission-based checks for subnav items
      if (item.subnav) {
        return {
          ...item,
          subnav: item.subnav.filter((subnavItem) => {
            if (permissions?.companyPermissions) {
              const cp = permissions.companyPermissions as BasePermission;
              const up = permissions.userPermissions as
                | BasePermission
                | undefined;

              const check = <K extends keyof BasePermission>(
                companyKey: K,
                userKey?: K,
              ) => {
                if (!cp[companyKey]) return false;
                if (!up || userKey === undefined) return true;
                return !!up[userKey];
              };

              switch (subnavItem.title) {
                case "Client":
                  return check(
                    "communicationHubClients",
                    "communicationHubClients",
                  );

                case "Internal":
                  return check(
                    "communicationHubInternal",
                    "communicationHubInternal",
                  );

                case "Collaboration":
                  return check(
                    "communicationHubCollaboration",
                    "communicationHubCollaboration",
                  );

                case "Shop Pipeline":
                  return check("shopPipeline", "shopPipeline");

                case "Sales Pipeline":
                  return check("salesPipeline", "salesPipeline");

                case "Inventory List":
                  return (
                    check("inventory", "inventory") ||
                    check("inventoryAll", "inventoryAll") ||
                    check("inventoryAllViewOnly", "inventoryAllViewOnly")
                  );

                case "Vendor List":
                  return (
                    check("inventory", "inventory") ||
                    check("inventoryAll", "inventoryAll") ||
                    check("inventoryAllViewOnly", "inventoryAllViewOnly")
                  );

                case "Camera":
                  return (
                    check("inventory", "inventory") ||
                    check("inventoryAll", "inventoryAll") ||
                    check("inventoryAllViewOnly", "inventoryAllViewOnly")
                  );

                default:
                  return true;
              }
            }

            return true;
          }),
        };
      }
      return item;
    });
}
