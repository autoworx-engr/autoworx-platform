"use client";

import {
  AUTOMATION_CHILD_PERMISSIONS,
  CHILD_PERMISSIONS,
  COMMUNICATION_HUB_CHILD_PERMISSIONS,
  staticPermissions,
} from "@/constants/static-permissions";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { useCreateCompanyPermission } from "@/hooks/feature-permissions/useCreateCompanyPermission";
import { useGetCompanyPermissions } from "@/hooks/feature-permissions/useGetCompanyPersmissions";
import {
  useBulkUpdatePermissions,
  useUpdateCompanyPermission,
} from "@/hooks/feature-permissions/useUpdateCompanyPermission";
import {
  PermissionCreate,
  PermissionItem,
  PermissionUpdate,
  StaticPermissionItem,
} from "@/types/feature-permission";
import getMissing, { formatPermissions } from "@/utils/formatPermission";
import { Switch } from "antd";
import { useEffect, useState } from "react";
import { MissingPermissionItemComponent } from "./MissingPermissionItemComponent";
import { PermissionItemComponent } from "./PermissionItemComponent";
import CarLoading from "@/components/common/CarLoading";

export default function FeaturePermission({
  companyId,
}: {
  companyId: number;
}) {
  const [permissions, setPermissions] = useState<PermissionItem[]>();

  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set([""])
  );
  const { data, isLoading } = useGetCompanyPermissions(companyId);

  const { mutate: createPermissionMutation, isPending: isCreatePending } =
    useCreateCompanyPermission();
  const { mutate: updatePermission, isPending } = useUpdateCompanyPermission();
  const { mutate: bulkUpdatePermissions, isPending: isBulkPending } =
    useBulkUpdatePermissions();

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

      // Auto-create Communication Hub if it doesn't exist and should be enabled by default
      const communicationHubExists = sortedPermissions.some(
        (p: PermissionItem) => p.permission_name === "communicationHub"
      );

      const communicationHubStatic = staticPermissions.find(
        (sp) => sp.permission_name === "communicationHub"
      );

      // If Communication Hub doesn't exist, create it
      if (!communicationHubExists && communicationHubStatic?.status === true) {
        const permissionsToCreate: PermissionCreate[] = [
          {
            companyId,
            permission_name: "communicationHub",
            title: communicationHubStatic.title,
            enabled: true,
          },
        ];

        try {
          createPermissionMutation(permissionsToCreate);
        } catch (error) {
          console.error("Failed to auto-create Communication Hub:", error);
        }
      }
    }
  }, [data, companyId, createPermissionMutation]);

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
  const finalMissingPermissions = getMissing(
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

  // const staticFormatted = formatPermissions(missionPermissions as any);
  // const finalMissingPermissions = missionPermissions;

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

  const updatePermissionInState = (
    updates: { permission_name: string; enabled: boolean }[]
  ) => {
    const updatePermissionRecursive = (
      items: PermissionItem[]
    ): PermissionItem[] => {
      return items?.map((item) => {
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

  const handleToggle = (
    permission_name: string,
    currentEnabled: boolean,
    title: string,
    children?: any[]
  ) => {
    const prevPermissions = permissions;
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

    const permissionsToUpdate: PermissionUpdate[] = [];

    updates.forEach((permission) => {
      const isInBackendPermission = data.data.some(
        (p: PermissionItem) => p.permission_name === permission.permission_name
      );

      if (isInBackendPermission) {
        permissionsToUpdate.push({
          companyId,
          permission_name: permission.permission_name,
          enabled: permission.enabled,
        });
      } else {
        const item = {
          permission_name,
          title,
          children: children || [],
          status: currentEnabled || true,
        };
        handleCreateToggle(item, currentEnabled);
      }
    });

    // Call mutation **once** for all updates
    if (permissionsToUpdate.length > 0) {
      try {
        updatePermission(permissionsToUpdate);
      } catch (error) {
        setPermissions(prevPermissions); // rollback if not update
        errorHandler(error);
      }
    }
  };

  const handleCreateToggle = (item: StaticPermissionItem, checked: boolean) => {
    const permissionsToCreate: PermissionCreate[] = [];

    const createPermissionObj = (
      name: string,
      enabled: boolean,
      fallbackTitle?: string
    ) => {
      const found = staticPermissions.find((p) => p.permission_name === name);
      return {
        companyId,
        permission_name: name,
        title: found?.title || fallbackTitle || name,
        enabled,
      };
    };

    // Utility to handle group permission creation
    const handleGroupPermissions = (
      group: string[],
      parentName: string,
      itemName: string,
      checked: boolean
    ) => {
      if (group.includes(itemName)) {
        permissionsToCreate.push(createPermissionObj(itemName, checked));

        group
          .filter((p) => p !== itemName)
          .forEach((child) => {
            permissionsToCreate.push(createPermissionObj(child, false));
          });
      }

      if (itemName === parentName) {
        group.forEach((child) =>
          permissionsToCreate.push(createPermissionObj(child, checked))
        );
      }
    };

    if (
      !CHILD_PERMISSIONS.includes(item.permission_name) &&
      !AUTOMATION_CHILD_PERMISSIONS.includes(item.permission_name) &&
      !COMMUNICATION_HUB_CHILD_PERMISSIONS.includes(item.permission_name)
    ) {
      permissionsToCreate.push(
        createPermissionObj(item.permission_name, checked)
      );
    }

    // Rule 1: Parent permissions → create children
    handleGroupPermissions(
      CHILD_PERMISSIONS,
      "directory",
      item.permission_name,
      checked
    );
    handleGroupPermissions(
      AUTOMATION_CHILD_PERMISSIONS,
      "automation",
      item.permission_name,
      checked
    );
    handleGroupPermissions(
      COMMUNICATION_HUB_CHILD_PERMISSIONS,
      "communicationHub",
      item.permission_name,
      checked
    );

    // Rule 2: Child permissions → create parent if needed
    const ensureParentPermission = (
      group: string[],
      parentName: string,
      fallbackTitle: string
    ) => {
      if (
        group.includes(item.permission_name) ||
        item.permission_name === parentName
      ) {
        const exists = permissions?.some(
          (p) => p.permission_name === parentName
        );
        if (!exists) {
          permissionsToCreate.push(
            createPermissionObj(parentName, true, fallbackTitle)
          );
        }
      }
    };

    ensureParentPermission(CHILD_PERMISSIONS, "directory", "Directory");
    ensureParentPermission(
      AUTOMATION_CHILD_PERMISSIONS,
      "automation",
      "All Automation"
    );
    ensureParentPermission(
      COMMUNICATION_HUB_CHILD_PERMISSIONS,
      "communicationHub",
      "Communication Hub"
    );

    if (permissionsToCreate.length > 0) {
      try {
        createPermissionMutation(permissionsToCreate);
      } catch (error) {
        errorHandler(error);
      }
    }
  };

  // Master Toggle functionality
  const handleMasterToggle = (enabled: boolean) => {
    // Recursive function to get all permission
    const getAllPermissionNames = (
      items: PermissionItem[] | StaticPermissionItem[]
    ): Array<{
      permission_name: string;
      title: string;
    }> => {
      const result: Array<{ permission_name: string; title: string }> = [];
      items?.forEach((item) => {
        result.push({
          permission_name: item.permission_name,
          title: item.title,
        });
        if (item.children && item.children.length > 0) {
          result.push(...getAllPermissionNames(item.children));
        }
      });
      return result;
    };

    // Get permissions from existing and missing separately
    const existingPermissions = getAllPermissionNames(sortedFormatted || []);
    const missingPermissions = getAllPermissionNames(
      finalMissingPermissions || []
    );

    // Update state optimistically for all permissions
    const allUpdates = [
      ...existingPermissions.map((p) => ({
        permission_name: p.permission_name,
        enabled: enabled,
      })),
      ...missingPermissions.map((p) => ({
        permission_name: p.permission_name,
        enabled: enabled,
      })),
    ];
    updatePermissionInState(allUpdates);

    // Handle existing permissions - use BULK UPDATE API
    if (existingPermissions.length > 0) {
      const permissionsToUpdate = existingPermissions.map((p) => ({
        permission_name: p.permission_name,
        enabled: enabled,
      }));

      try {
        bulkUpdatePermissions({
          companyId,
          permissions: permissionsToUpdate,
        });
      } catch (error) {
        errorHandler(error);
      }
    }

    // Handle missing permissions
    if (missingPermissions.length > 0) {
      const permissionsToCreate: PermissionCreate[] = missingPermissions.map(
        (p) => ({
          companyId,
          permission_name: p.permission_name,
          title: p.title,
          enabled: enabled,
        })
      );

      try {
        createPermissionMutation(permissionsToCreate);
      } catch (error) {
        errorHandler(error);
      }
    }
  };

  // Calculate if all permissions are enabled for master toggle state
  const allPermissionsEnabled = () => {
    // Recursive function to count enabled permissions including children
    const countEnabledPermissions = (
      items: PermissionItem[],
      isExisting = true
    ): number => {
      let count = 0;
      items?.forEach((item) => {
        if (isExisting ? item.enabled : (item as any).status) {
          count++;
        }
        if (item.children && item.children.length > 0) {
          count += countEnabledPermissions(item.children, isExisting);
        }
      });
      return count;
    };

    // Recursive function to count total permissions including children
    const countTotalPermissions = (
      items: PermissionItem[] | StaticPermissionItem[]
    ): number => {
      let count = 0;
      items?.forEach((item) => {
        count++;
        if (item.children && item.children.length > 0) {
          count += countTotalPermissions(item.children);
        }
      });
      return count;
    };

    const enabledExistingCount = countEnabledPermissions(sortedFormatted || []);
    const enabledMissingCount = countEnabledPermissions(
      finalMissingPermissions || ([] as any),
      false
    );
    const totalExistingCount = countTotalPermissions(sortedFormatted || []);
    const totalMissingCount = countTotalPermissions(
      finalMissingPermissions || []
    );
    const totalCount = totalExistingCount + totalMissingCount;
    const totalEnabledCount = enabledExistingCount + enabledMissingCount;

    return totalEnabledCount === totalCount && totalCount > 0;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full animate-pulse items-center justify-center rounded-md bg-gray-200 p-4 shadow-sm md:p-6">
        <CarLoading />
      </div>
    );
  }

  return (
    <div className="mx-auto min-w-full rounded-lg border border-gray-200 bg-white px-2 py-4 shadow-sm lg:p-8">
      <div className="space-y-1 px-4">
        {/* Header with Master Toggle */}
        <div className="flex items-center justify-between border-b-2 border-[#66738C] pb-3">
          <span className="text-xl font-semibold text-[#66738C]">Modules</span>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-semibold text-[#66738C]">
                Toggle:
              </span>
              <Switch
                checked={allPermissionsEnabled()}
                disabled={isPending || isCreatePending || isBulkPending}
                onChange={(checked) => handleMasterToggle(checked)}
                className="shadow-md"
              />
            </div>
            {/* <span className="text-xl font-semibold text-[#66738C]">Toggle</span> */}
          </div>
        </div>

        {sortedFormatted?.map((item: PermissionItem) => (
          <PermissionItemComponent
            key={item.id}
            item={item}
            expandedItems={expandedItems}
            toggleExpanded={toggleExpanded}
            handleToggle={handleToggle}
            isPending={isPending}
          />
        ))}
        {finalMissingPermissions?.map((missingItem: StaticPermissionItem) => (
          <MissingPermissionItemComponent
            key={missingItem.title}
            item={missingItem}
            expandedItems={expandedItems}
            toggleExpanded={toggleExpanded}
            handleCreateToggle={handleCreateToggle}
            isCreatePending={isCreatePending}
          />
        ))}
      </div>
    </div>
  );
}
