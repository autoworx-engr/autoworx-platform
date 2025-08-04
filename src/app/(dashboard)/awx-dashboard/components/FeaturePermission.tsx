"use client";

import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { useCreateCompanyPermission } from "@/hooks/feature-permissions/useCreateCompanyPermission";
import { useGetCompanyPermissions } from "@/hooks/feature-permissions/useGetCompanyPersmissions";
import { useUpdateCompanyPermission } from "@/hooks/feature-permissions/useUpdateCompanyPermission";
import getMissing, { formatPermissions } from "@/utils/formatPermission";
import { Spin, Switch } from "antd";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

export interface PermissionItem {
  id?: number;
  permission_name: string;
  title: string;
  companyId?: number;
  enabled: boolean;
  children?: PermissionItem[];
}

export interface StaticPermissionItem {
  title: string;
  permission_name: string;
  status: boolean;
  children?: StaticPermissionItem[];
}

const staticPermissions = [
  {
    title: "Communication Hub: Internal",
    permission_name: "communicationHubInternal",
    status: false,
  },
  {
    title: "Communication Hub: Clients",
    permission_name: "communicationHubClients",
    status: false,
  },
  {
    title: "Communication Hub: Collaboration",
    permission_name: "communicationHubCollaboration",
    status: false,
  },
  {
    title: "Communication Hub",
    permission_name: "communicationHub",
    status: false,
  },
  { title: "Communication", permission_name: "communication", status: false },
  { title: "Calling Access", permission_name: "callingAccess", status: false },
  {
    title: "Estimates & Invoices",
    permission_name: "estimateInvoices",
    status: false,
  },
  { title: "Calendar & Task", permission_name: "calendar", status: false },
  { title: "Payments", permission_name: "payments", status: false },
  { title: "Directory", permission_name: "directory", status: false },
  { title: "Client", permission_name: "clientDirectory", status: false },
  { title: "Employee", permission_name: "employeeDirectory", status: false },
  { title: "Fleet", permission_name: "fleetDirectory", status: false },
  {
    title: "Reporting & Analytics",
    permission_name: "reporting",
    status: false,
  },
  { title: "Inventory", permission_name: "inventory", status: false },
  { title: "Integrations", permission_name: "integrations", status: false },
  { title: "All Automation", permission_name: "automation", status: false },
  { title: "Sales Pipeline", permission_name: "salesPipeline", status: false },
  { title: "Shop Pipeline", permission_name: "shopPipeline", status: false },
  {
    title: "Business Settings",
    permission_name: "businessSettings",
    status: false,
  },
  {
    title: "Workforce Management",
    permission_name: "workforceManagement",
    status: false,
  },
  {
    title: "Service Estimator",
    permission_name: "serviceEstimator",
    status: false,
  },
  {
    title: "Pipeline Automation",
    permission_name: "pipelineAutomation",
    status: false,
  },
  {
    title: "Marketing Automation",
    permission_name: "marketingAutomation",
    status: false,
  },
  {
    title: "Communication Automation",
    permission_name: "communicationAutomation",
    status: false,
  },
  {
    title: "Invoice Automation",
    permission_name: "invoiceAutomation",
    status: false,
  },
  {
    title: "Inventory Automation",
    permission_name: "inventoryAutomation",
    status: false,
  },
  {
    title: "Service Automation",
    permission_name: "serviceAutomation",
    status: false,
  },
  // {
  //   title: 'Reputation Management',
  //   permission_name: 'reputationManagement',
  //   status: false,
  // },
];
export default function FeaturePermission({
  companyId,
}: {
  companyId: number;
}) {
  const [permissions, setPermissions] = useState<PermissionItem[]>();

  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set([""])
  );
  const { data, isLoading, isFetching } = useGetCompanyPermissions(companyId);

  const { mutate: createPermissionMutation, isPending: isCreatePending } =
    useCreateCompanyPermission(companyId);
  const { mutate: updatePermission, isPending } = useUpdateCompanyPermission();

  useEffect(() => {
    if (data) {
      // Sort permissions based on the order in staticPermissions
      const sortedPermissions = data.data.sort(
        (a: PermissionItem, b: PermissionItem) => {
          const aIndex = staticPermissions.findIndex(
            (sp) => sp.permission_name === a.permission_name
          );
          const bIndex = staticPermissions.findIndex(
            (sp) => sp.permission_name === b.permission_name
          );

          // If both permissions are found in staticPermissions, sort by their index
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }

          // If only one is found, prioritize the one in staticPermissions
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;

          // If neither is found, maintain original order
          return 0;
        }
      );

      setPermissions(sortedPermissions);
    }
  }, [data, companyId]);

  const formatted = formatPermissions(permissions as any);

  // Sort the formatted permissions based on staticPermissions order
  const sortedFormatted = formatted?.sort(
    (a: PermissionItem, b: PermissionItem) => {
      const aIndex = staticPermissions.findIndex(
        (sp) => sp.permission_name === a.permission_name
      );
      const bIndex = staticPermissions.findIndex(
        (sp) => sp.permission_name === b.permission_name
      );

      // If both permissions are found in staticPermissions, sort by their index
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      // If only one is found, prioritize the one in staticPermissions
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      // If neither is found, maintain original order
      return 0;
    }
  );

  // Sort the missing permissions based on staticPermissions order
  const missionPermissions = getMissing(
    staticPermissions,
    permissions || []
  ).sort((a: StaticPermissionItem, b: StaticPermissionItem) => {
    const aIndex = staticPermissions.findIndex(
      (sp) => sp.permission_name === a.permission_name
    );
    const bIndex = staticPermissions.findIndex(
      (sp) => sp.permission_name === b.permission_name
    );
    return aIndex - bIndex;
  });

  const staticFormatted = formatPermissions(missionPermissions as any);
  const hasCommunicationHubInFormatted = formatted?.some(
    (item) => item.permission_name === "communicationHub"
  );

  const finalMissingPermissions = hasCommunicationHubInFormatted
    ? staticFormatted.filter(
        (item) => item.permission_name !== "communicationHub"
      )
    : staticFormatted;
  const CHILD_PERMISSIONS = [
    "fleetDirectory",
    "clientDirectory",
    "employeeDirectory",
  ];
  const AUTOMATION_CHILD_PERMISSIONS = [
    "pipelineAutomation",
    "marketingAutomation",
    "communicationAutomation",
    "invoiceAutomation",
    "inventoryAutomation",
    "serviceAutomation",
  ];
  const COMMUNICATION_HUB_CHILD_PERMISSIONS = [
    "communicationHubInternal",
    "communicationHubClients",
    "communicationHubCollaboration",
  ];

  const updatePermissionInState = (
    updates: { permission_name: string; enabled: boolean }[]
  ) => {
    const updatePermissionRecursive = (
      items: PermissionItem[]
    ): PermissionItem[] => {
      return items.map((item) => {
        const foundUpdate = updates.find(
          (u) => u.permission_name === item.permission_name
        );
        const updatedChildren = item.children
          ? updatePermissionRecursive(item.children)
          : undefined;

        if (foundUpdate) {
          return {
            ...item,
            enabled: foundUpdate.enabled,
            children: updatedChildren,
          };
        }

        return {
          ...item,
          children: updatedChildren,
        };
      });
    };

    setPermissions((prev) => updatePermissionRecursive(prev!));
  };

  const handleToggle = (permission_name: string, currentEnabled: boolean) => {
    const newEnabled = currentEnabled;
    let updates: { permission_name: string; enabled: boolean }[] = [
      { permission_name, enabled: newEnabled },
    ];

    // Rule 1: directory → update children
    if (permission_name === "directory") {
      updates = [
        { permission_name: "directory", enabled: newEnabled },
        ...CHILD_PERMISSIONS.map((child) => ({
          permission_name: child,
          enabled: newEnabled,
        })),
      ];
    }
    if (permission_name === "automation") {
      updates = [
        { permission_name: "automation", enabled: newEnabled },
        ...AUTOMATION_CHILD_PERMISSIONS.map((child) => ({
          permission_name: child,
          enabled: newEnabled,
        })),
      ];
    }
    if (permission_name === "communicationHub") {
      updates = [
        { permission_name: "communicationHub", enabled: newEnabled },
        ...COMMUNICATION_HUB_CHILD_PERMISSIONS.map((child) => ({
          permission_name: child,
          enabled: newEnabled,
        })),
      ];
    }

    // Rule 2: child → update directory if necessary
    if (CHILD_PERMISSIONS.includes(permission_name)) {
      // Need access to current permission state
      const otherChildrenEnabled = permissions?.some(
        (p) =>
          p.permission_name !== permission_name &&
          CHILD_PERMISSIONS.includes(p.permission_name) &&
          p.enabled
      );

      const shouldEnableDirectory = newEnabled || otherChildrenEnabled;
      updates.push({
        permission_name: "directory",
        enabled: shouldEnableDirectory!,
      });
    }
    if (AUTOMATION_CHILD_PERMISSIONS.includes(permission_name)) {
      // Need access to current permission state
      const otherChildrenEnabled = permissions?.some(
        (p) =>
          p.permission_name !== permission_name &&
          AUTOMATION_CHILD_PERMISSIONS.includes(p.permission_name) &&
          p.enabled
      );

      const shouldEnableAutomation = newEnabled || otherChildrenEnabled;
      updates.push({
        permission_name: "automation",
        enabled: shouldEnableAutomation!,
      });
    }
    if (COMMUNICATION_HUB_CHILD_PERMISSIONS.includes(permission_name)) {
      // Need access to current permission state
      const otherChildrenEnabled = permissions?.some(
        (p) =>
          p.permission_name !== permission_name &&
          COMMUNICATION_HUB_CHILD_PERMISSIONS.includes(p.permission_name) &&
          p.enabled
      );

      const shouldEnableCommunicationHub = newEnabled || otherChildrenEnabled;
      updates.push({
        permission_name: "communicationHub",
        enabled: shouldEnableCommunicationHub!,
      });
    }

    // Optimistic update in state
    updatePermissionInState(updates);

    // API call with multiple updates
    updatePermission(
      updates.map((u) => ({
        companyId,
        ...u,
      }))
    );
  };

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const createPermissionInState = (create: {
    permission_name: string;
    title: string;
    enabled: boolean;
  }) => {
    try {
      createPermissionMutation(create);
    } catch (error) {
      errorHandler(error);
    }
  };

  const handleCreateToggle = (item: StaticPermissionItem, checked: boolean) => {
    // Rule 1: Parent permissions → create children
    if (item.permission_name === "directory") {
      const childPermissions = CHILD_PERMISSIONS.map((child) => {
        const childItem = staticPermissions.find(
          (p) => p.permission_name === child
        );
        createPermissionInState({
          permission_name: child,
          title: childItem?.title || child,
          enabled: checked,
        });
      });
    }

    if (item.permission_name === "automation") {
      const childPermissions = AUTOMATION_CHILD_PERMISSIONS.map((child) => {
        const childItem = staticPermissions.find(
          (p) => p.permission_name === child
        );
        createPermissionInState({
          permission_name: child,
          title: childItem?.title || child,
          enabled: checked,
        });
      });
    }

    if (item.permission_name === "communicationHub") {
      const childPermissions = COMMUNICATION_HUB_CHILD_PERMISSIONS.map(
        (child) => {
          const childItem = staticPermissions.find(
            (p) => p.permission_name === child
          );
          createPermissionInState({
            permission_name: child,
            title: childItem?.title || child,
            enabled: checked,
          });
        }
      );
    }

    // Rule 2: Child permissions → create parent if needed
    if (CHILD_PERMISSIONS.includes(item.permission_name)) {
      const directoryExists = permissions?.some(
        (p) => p.permission_name === "directory"
      );
      if (!directoryExists) {
        const directoryItem = staticPermissions.find(
          (p) => p.permission_name === "directory"
        );
        createPermissionInState({
          permission_name: "directory",
          title: directoryItem?.title || "Directory",
          enabled: checked,
        });
      }
    }

    if (AUTOMATION_CHILD_PERMISSIONS.includes(item.permission_name)) {
      const automationExists = permissions?.some(
        (p) => p.permission_name === "automation"
      );
      if (!automationExists) {
        const automationItem = staticPermissions.find(
          (p) => p.permission_name === "automation"
        );
        createPermissionInState({
          permission_name: "automation",
          title: automationItem?.title || "All Automation",
          enabled: checked,
        });
      }
    }

    if (COMMUNICATION_HUB_CHILD_PERMISSIONS.includes(item.permission_name)) {
      const communicationHubExists = permissions?.some(
        (p) => p.permission_name === "communicationHub"
      );
      if (!communicationHubExists) {
        const communicationHubItem = staticPermissions.find(
          (p) => p.permission_name === "communicationHub"
        );
        createPermissionInState({
          permission_name: "communicationHub",
          title: communicationHubItem?.title || "Communication Hub",
          enabled: checked,
        });
      }
    }

    // Create all permissions
    // permissionsToCreate.forEach((permission) => {
    //   createPermissionInState(permission);
    // });
  };

  console.log("permissions", permissions);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full animate-pulse items-center justify-center rounded-md bg-gray-200 p-4 shadow-sm md:p-6">
        <Spin />
      </div>
    );
  }
  const renderPermissionItem = (item: PermissionItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.title);

    return (
      <div key={item.permission_name}>
        <div
          className={`flex items-center justify-between rounded-xl border-b border-b-gray-100 py-3 ${
            level > 0 ? "ml-6" : ""
          }`}
        >
          <div className="flex flex-1 items-center pr-4">
            {!hasChildren && level > 0 && <div className="mr-2 w-6" />}
            <span className="text-sm text-[#66738C]">{item.title}</span>
            {hasChildren && (
              <button
                onClick={() => toggleExpanded(item.title)}
                className="mr-2 rounded p-1 hover:bg-gray-100"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-[#66738C]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[#66738C]" />
                )}
              </button>
            )}
          </div>
          <Switch
            checked={item.enabled}
            disabled={isPending}
            onChange={(checked) => handleToggle(item.permission_name, checked)}
            className="max-w-2 shadow-md"
          />
        </div>

        {hasChildren && isExpanded && (
          <div>
            {item.children!.map((child) =>
              renderPermissionItem(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMissingPermissionItem = (
    item: StaticPermissionItem,
    level = 0
  ) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.title);

    return (
      <div key={item.permission_name}>
        <div
          className={`flex items-center justify-between rounded-xl border-b border-b-gray-100 py-3 ${
            level > 0 ? "ml-6" : ""
          }`}
        >
          <div className="flex flex-1 items-center pr-4">
            {!hasChildren && level > 0 && <div className="mr-2 w-6" />}
            <span className="text-sm text-[#66738C]">{item.title}</span>
            {hasChildren && (
              <button
                onClick={() => toggleExpanded(item.title)}
                className="mr-2 rounded p-1 hover:bg-gray-100"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-[#66738C]" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-[#66738C]" />
                )}
              </button>
            )}
          </div>
          <Switch
            checked={item.status}
            disabled={isCreatePending}
            onChange={(checked) => handleCreateToggle(item, checked)}
            className="max-w-2 shadow-md"
          />
        </div>

        {hasChildren && isExpanded && (
          <div>
            {item.children!.map((child) =>
              renderMissingPermissionItem(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto min-w-full rounded-lg border border-gray-200 bg-white px-2 py-4 shadow-sm lg:p-8">
      <div className="space-y-1 px-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#66738C] pb-3">
          <span className="text-xl font-semibold text-[#66738C]">Modules</span>
          <span className="text-xl font-semibold text-[#66738C]">Toggle</span>
        </div>

        {/* Permission Items */}
        {sortedFormatted?.map((item: PermissionItem) =>
          renderPermissionItem(item)
        )}
        {finalMissingPermissions?.map((item: StaticPermissionItem) =>
          renderMissingPermissionItem(item)
        )}
      </div>
    </div>
  );
}
