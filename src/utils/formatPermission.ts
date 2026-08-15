import { staticPermissions } from "@/constants/static-permissions";
import {
  PermissionItem,
  StaticPermissionItem,
} from "@/types/feature-permission";

/**
 * `staticPermissions` is the source of truth for labels. Rows already stored in
 * CompanyPermissionModule keep whatever title they were created with, so
 * renaming a module here would otherwise only affect companies created after
 * the rename.
 */
function resolveTitle(permission_name: string, fallback: string) {
  return (
    staticPermissions.find((sp) => sp.permission_name === permission_name)
      ?.title ?? fallback
  );
}

export function formatPermissions(permissions: any[]) {
  const result: any[] = [];

  const directoryChildren = [
    "clientDirectory",
    "fleetDirectory",
    "employeeDirectory",
  ];

  const automationChildren = [
    "pipelineAutomation",

    "marketingAutomation",

    "communicationAutomation",

    "serviceAutomation",

    "inventoryAutomation",

    "invoiceAutomation",
    "tagAutomation",
    "reportingAutomation",
  ];

  const communicationHubChildren = [
    "communicationHubInternal",
    "communicationHubClients",
    "communicationHubCollaboration",
  ];

  // Extract directory and automation parent permissions from the full permissions array

  const directoryParent = permissions?.find(
    (p) => p.permission_name === "directory",
  );

  const automationParent = permissions?.find(
    (p) => p.permission_name === "automation",
  );

  const communicationHubParent = permissions?.find(
    (p) => p.permission_name === "communicationHub",
  );

  const directoryGroup: any = {
    title: "Directory",

    permission_name: "directory",

    enabled: directoryParent?.enabled ?? false,

    children: [],
  };

  const automationGroup: any = {
    title: "All Automation",

    permission_name: "automation",

    enabled: automationParent?.enabled ?? false,

    children: [],
  };

  const communicationHubGroup: any = {
    title: "Communication Hub",
    permission_name: "communicationHub",
    enabled: communicationHubParent?.enabled ?? false,
    children: [],
  };

  permissions?.forEach((raw: any) => {
    const { permission_name } = raw;

    if (
      permission_name === "directory" ||
      permission_name === "automation" ||
      permission_name === "communicationHub"
    ) {
      // Already handled

      return;
    }

    const permission = {
      ...raw,
      title: resolveTitle(permission_name, raw.title),
    };

    if (directoryChildren.includes(permission_name)) {
      directoryGroup.children.push(permission);
    } else if (automationChildren.includes(permission_name)) {
      automationGroup.children.push(permission);
    } else if (communicationHubChildren.includes(permission_name)) {
      communicationHubGroup.children.push(permission);
    } else {
      // All other permissions as top-level

      result.push(permission);
    }
  });

  if (directoryGroup.children.length > 0) result.push(directoryGroup);

  if (automationGroup.children.length > 0) result.push(automationGroup);
  if (communicationHubGroup.children.length > 0)
    result.push(communicationHubGroup);

  return result;
}

export default function getMissing(
  staticArr: StaticPermissionItem[],
  backendArr: PermissionItem[],
) {
  const backendNames = new Set(backendArr.map((item) => item.permission_name));
  return formatPermissions(
    staticArr.filter((sp) => !backendNames.has(sp.permission_name)),
  );
}

type Permission = {
  title: string;
  permission_name: string;
  status?: boolean;
  enabled: boolean;
  children?: Permission[];
};

export const mergePermissions = (
  dbPerms: Permission[],
  staticPerms: Permission[],
): Permission[] => {
  const staticMap = new Map(staticPerms.map((p) => [p.permission_name, p]));

  const mergeRecursive = (
    dbList: Permission[],
    staticList: Permission[],
  ): Permission[] => {
    const result: Permission[] = [];
    const used = new Set<string>();

    // 1️⃣ DB permissions first (priority)
    dbList.forEach((dbPerm) => {
      const staticPerm = staticMap.get(dbPerm.permission_name);
      used.add(dbPerm.permission_name);

      result.push({
        ...staticPerm,
        ...dbPerm,
        enabled: dbPerm.enabled ?? staticPerm?.status ?? false,
        children: mergeRecursive(
          dbPerm.children || [],
          staticPerm?.children || [],
        ),
      });
    });

    // 2️⃣ Static permissions missing in DB
    staticList.forEach((staticPerm) => {
      if (!used.has(staticPerm.permission_name)) {
        result.push({
          ...staticPerm,
          enabled: staticPerm.status ?? false,
          children: mergeRecursive([], staticPerm.children || []),
        });
      }
    });

    return result;
  };

  return mergeRecursive(dbPerms, staticPerms);
};
