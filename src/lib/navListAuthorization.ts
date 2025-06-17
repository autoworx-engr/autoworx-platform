import { PermissionsResult } from "@/lib/getPermissions";

type NavItem = {
  title: string;
  icon: string;
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
          ["Invoices", "Payments", "Directory", "Inventory"].includes(
            item.title,
          )
        ) {
          return false;
        }
      }
      // Permission-based checks
      if (permissions?.userPermissions) {
        switch (item.title) {
          case "Communication Hub":
            return (
              permissions.userPermissions.communicationHubClients ||
              permissions.userPermissions.communicationHubInternal ||
              permissions.userPermissions.communicationHubCollaboration
            );
          case "Task and Activity Management":
            return permissions.userPermissions.calendarTask;
          case "Pipelines":
            return (
              permissions.userPermissions.shopPipeline ||
              permissions.userPermissions.salesPipeline
            );
          case "Analytics and Reporting":
            return (
              permissions.userPermissions.reporting ||
              permissions.userPermissions.reportingViewOnly
            );
          case "Invoices":
            return permissions.userPermissions.estimatesInvoices;
          case "Payments":
            return permissions.userPermissions.payments;
          case "Inventory":
            return (
              permissions.userPermissions.inventory ||
              permissions.userPermissions.inventoryAllViewOnly
            );
          case "Directory":
            return (
              permissions.userPermissions.workforceManagement ||
              permissions.userPermissions.workforceManagementViewOnly
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
            subnav:
              item.subnav?.filter(
                (subnavItem) => subnavItem.title === "Shop Pipeline",
              ) || null,
          };
        }
      }
      if (permissions?.role === "Sales") {
        if (item.title === "Pipelines") {
          return {
            ...item,
            subnav:
              item.subnav?.filter(
                (subnavItem) => subnavItem.title === "Sales Pipeline",
              ) || null,
          };
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
            if (permissions?.userPermissions) {
              switch (subnavItem.title) {
                case "Client":
                  return permissions.userPermissions.communicationHubClients;
                case "Internal":
                  return permissions.userPermissions.communicationHubInternal;
                case "Collaboration":
                  return permissions.userPermissions
                    .communicationHubCollaboration;
                case "Shop Pipeline":
                  return permissions.userPermissions.shopPipeline;
                case "Sales Pipeline":
                  return permissions.userPermissions.salesPipeline;
                case "Inventory List":
                  return permissions.userPermissions.inventory;
                case "Vendor List":
                  return permissions.userPermissions.inventoryAllViewOnly;
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
