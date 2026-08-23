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
import getMissing, {
  formatPermissions,
  mergePermissions,
} from "@/utils/formatPermission";
import { Switch } from "antd";
import { useEffect, useMemo, useState } from "react";
import { MissingPermissionItemComponent } from "./MissingPermissionItemComponent";
import { PermissionItemComponent } from "./PermissionItemComponent";
import CarLoading from "@/components/common/CarLoading";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Shared sort comparator: orders items by their position in staticPermissions. */
const sortByStaticOrder = (
  a: { permission_name: string },
  b: { permission_name: string },
) => {
  const ai = staticPermissions.findIndex(
    (sp) => sp.permission_name === a.permission_name,
  );
  const bi = staticPermissions.findIndex(
    (sp) => sp.permission_name === b.permission_name,
  );
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return 0;
};

// ─── component ───────────────────────────────────────────────────────────────

export default function FeaturePermission({
  companyId,
}: {
  companyId: number;
}) {
  const [permissions, setPermissions] = useState<PermissionItem[]>();

  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set([""]),
  );
  const { data, isLoading } = useGetCompanyPermissions(companyId);

  const { mutate: createPermissionMutation, isPending: isCreatePending } =
    useCreateCompanyPermission();
  const { mutate: updatePermission, isPending } = useUpdateCompanyPermission();
  const { mutate: bulkUpdatePermissions, isPending: isBulkPending } =
    useBulkUpdatePermissions();

  useEffect(() => {
    if (!data) return;

    const sortedPermissions = [...data.data].sort(sortByStaticOrder);
    setPermissions(sortedPermissions);

    // Auto-create Communication Hub if missing and should be enabled by default
    const communicationHubExists = sortedPermissions.some(
      (p: PermissionItem) => p.permission_name === "communicationHub",
    );
    const communicationHubStatic = staticPermissions.find(
      (sp) => sp.permission_name === "communicationHub",
    );

    if (!communicationHubExists && communicationHubStatic?.status === true) {
      const permissionsToCreate: PermissionCreate[] = [
        {
          companyId,
          permission_name: "communicationHub",
          title: communicationHubStatic.title,
          enabled: true,
        },
      ];
      createPermissionMutation(permissionsToCreate, {
        onError: (error) => {
          errorHandler(error);
        },
      });
    }
  }, [data, companyId, createPermissionMutation]);

  const sortedFormatted = useMemo(
    () => formatPermissions(permissions as any)?.sort(sortByStaticOrder) ?? [],
    [permissions],
  );

  const finalMissingPermissions = useMemo(
    () =>
      getMissing(staticPermissions, permissions || []).sort(sortByStaticOrder),
    [permissions],
  );

  const combinedPermissions = useMemo(
    () => mergePermissions(sortedFormatted, finalMissingPermissions),
    [sortedFormatted, finalMissingPermissions],
  );

  const allPermissionsEnabled = useMemo(() => {
    const countEnabled = (items: PermissionItem[], isExisting = true): number =>
      items?.reduce((acc, item) => {
        const self = isExisting ? item.enabled : (item as any).status;
        return (
          acc +
          (self ? 1 : 0) +
          (item.children ? countEnabled(item.children, isExisting) : 0)
        );
      }, 0) ?? 0;

    const countTotal = (
      items: PermissionItem[] | StaticPermissionItem[],
    ): number =>
      items?.reduce(
        (acc, item) =>
          acc + 1 + (item.children ? countTotal(item.children) : 0),
        0,
      ) ?? 0;

    const enabledCount =
      countEnabled(sortedFormatted) +
      countEnabled(finalMissingPermissions as any, false);
    const totalCount =
      countTotal(sortedFormatted) + countTotal(finalMissingPermissions);

    return totalCount > 0 && enabledCount === totalCount;
  }, [sortedFormatted, finalMissingPermissions]);

  // ─── state helpers ─────────────────────────────────────────────────────────

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const updatePermissionInState = (
    updates: { permission_name: string; enabled: boolean }[],
  ) => {
    const updateRecursive = (items: PermissionItem[]): PermissionItem[] =>
      items?.map((item) => {
        const found = updates.find(
          (u) => u.permission_name === item.permission_name,
        );
        const updatedChildren = item.children
          ? updateRecursive(item.children)
          : undefined;
        return {
          ...item,
          ...(found ? { enabled: found.enabled } : {}),
          children: updatedChildren,
        };
      });

    setPermissions((prev) => updateRecursive(prev!));
  };

  // ─── toggle handler ────────────────────────────────────────────────────────

  const handleToggle = (
    permission_name: string,
    currentEnabled: boolean,
    title: string,
    children?: any[],
  ) => {
    const prevPermissions = permissions;
    const newEnabled = currentEnabled;
    let updates: { permission_name: string; enabled: boolean }[] = [
      { permission_name, enabled: newEnabled },
    ];

    // Rule 1: parent → cascade to children
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

    // Rule 2: child → update parent accordingly
    const bubbleParent = (group: string[], parentName: string) => {
      if (!group.includes(permission_name)) return;
      const otherChildrenEnabled = permissions?.some(
        (p) =>
          p.permission_name !== permission_name &&
          group.includes(p.permission_name) &&
          p.enabled,
      );
      updates.push({
        permission_name: parentName,
        enabled: !!(newEnabled || otherChildrenEnabled),
      });
    };
    bubbleParent(CHILD_PERMISSIONS, "directory");
    bubbleParent(AUTOMATION_CHILD_PERMISSIONS, "automation");
    bubbleParent(COMMUNICATION_HUB_CHILD_PERMISSIONS, "communicationHub");

    updatePermissionInState(updates);

    const permissionsToUpdate: PermissionUpdate[] = [];

    updates.forEach((update) => {
      const isInBackend = data.data.some(
        (p: PermissionItem) => p.permission_name === update.permission_name,
      );

      if (isInBackend) {
        permissionsToUpdate.push({
          companyId,
          permission_name: update.permission_name,
          enabled: update.enabled,
        });
      } else {
        // BUG FIX: use update.permission_name (current iteration), not outer closure
        const staticItem = staticPermissions.find(
          (sp) => sp.permission_name === update.permission_name,
        );
        handleCreateToggle(
          {
            permission_name: update.permission_name,
            title: staticItem?.title ?? update.permission_name,
            status: update.enabled,
          },
          update.enabled,
        );
      }
    });

    if (permissionsToUpdate.length > 0) {
      updatePermission(permissionsToUpdate, {
        onError: (error) => {
          setPermissions(prevPermissions);
          errorHandler(error);
        },
      });
    }
  };

  // ─── create handler ────────────────────────────────────────────────────────

  const handleCreateToggle = (item: StaticPermissionItem, checked: boolean) => {
    const permissionsToCreate: PermissionCreate[] = [];

    const createPermissionObj = (
      name: string,
      enabled: boolean,
      fallbackTitle?: string,
    ) => {
      const found = staticPermissions.find((p) => p.permission_name === name);
      return {
        companyId,
        permission_name: name,
        title: found?.title || fallbackTitle || name,
        enabled,
      };
    };

    const handleGroupPermissions = (
      group: string[],
      parentName: string,
      itemName: string,
      checked: boolean,
    ) => {
      if (group.includes(itemName)) {
        permissionsToCreate.push(createPermissionObj(itemName, checked));
        group
          .filter((p) => p !== itemName)
          .forEach((child) => {
            permissionsToCreate.push(createPermissionObj(child, true));
          });
      }
      if (itemName === parentName) {
        group.forEach((child) =>
          permissionsToCreate.push(createPermissionObj(child, checked)),
        );
      }
    };

    if (
      !CHILD_PERMISSIONS.includes(item.permission_name) &&
      !AUTOMATION_CHILD_PERMISSIONS.includes(item.permission_name) &&
      !COMMUNICATION_HUB_CHILD_PERMISSIONS.includes(item.permission_name)
    ) {
      permissionsToCreate.push(
        createPermissionObj(item.permission_name, checked),
      );
    }

    handleGroupPermissions(
      CHILD_PERMISSIONS,
      "directory",
      item.permission_name,
      checked,
    );
    handleGroupPermissions(
      AUTOMATION_CHILD_PERMISSIONS,
      "automation",
      item.permission_name,
      checked,
    );
    handleGroupPermissions(
      COMMUNICATION_HUB_CHILD_PERMISSIONS,
      "communicationHub",
      item.permission_name,
      checked,
    );

    const ensureParentPermission = (
      group: string[],
      parentName: string,
      fallbackTitle: string,
    ) => {
      if (
        group.includes(item.permission_name) ||
        item.permission_name === parentName
      ) {
        const exists = permissions?.some(
          (p) => p.permission_name === parentName,
        );
        if (!exists) {
          permissionsToCreate.push(
            createPermissionObj(parentName, true, fallbackTitle),
          );
        }
      }
    };
    ensureParentPermission(CHILD_PERMISSIONS, "directory", "Directory");
    ensureParentPermission(
      AUTOMATION_CHILD_PERMISSIONS,
      "automation",
      "All Automation",
    );
    ensureParentPermission(
      COMMUNICATION_HUB_CHILD_PERMISSIONS,
      "communicationHub",
      "Communication Hub",
    );

    if (permissionsToCreate.length > 0) {
      createPermissionMutation(permissionsToCreate, {
        onError: (error) => errorHandler(error),
      });
    }
  };

  // ─── master toggle ─────────────────────────────────────────────────────────

  const handleMasterToggle = (enabled: boolean) => {
    const getAllPermissionNames = (
      items: PermissionItem[] | StaticPermissionItem[],
    ): Array<{ permission_name: string; title: string }> => {
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

    const existingPermissions = getAllPermissionNames(sortedFormatted || []);
    const missingPermissions = getAllPermissionNames(
      finalMissingPermissions || [],
    );

    updatePermissionInState([
      ...existingPermissions.map((p) => ({
        permission_name: p.permission_name,
        enabled,
      })),
      ...missingPermissions.map((p) => ({
        permission_name: p.permission_name,
        enabled,
      })),
    ]);

    if (existingPermissions.length > 0) {
      bulkUpdatePermissions(
        {
          companyId,
          permissions: existingPermissions.map((p) => ({
            permission_name: p.permission_name,
            enabled,
          })),
        },
        { onError: (error) => errorHandler(error) },
      );
    }

    if (missingPermissions.length > 0) {
      const permissionsToCreate: PermissionCreate[] = missingPermissions.map(
        (p) => ({
          companyId,
          permission_name: p.permission_name,
          title: p.title,
          enabled,
        }),
      );
      createPermissionMutation(permissionsToCreate, {
        onError: (error) => errorHandler(error),
      });
    }
  };

  // ─── render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-screen w-full animate-pulse items-center justify-center rounded-md bg-gray-200 p-4 shadow-sm md:p-6">
        <CarLoading />
      </div>
    );
  }

  return (
    <div className="h-full lg:h-[82vh] overflow-y-auto mx-auto min-w-full rounded-lg border border-gray-200 bg-white px-2 py-4 shadow-sm lg:p-8">
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
                checked={allPermissionsEnabled}
                disabled={isPending || isCreatePending || isBulkPending}
                onChange={(checked) => handleMasterToggle(checked)}
                className="shadow-md"
              />
            </div>
          </div>
        </div>

        {combinedPermissions?.map((item: PermissionItem) => (
          <PermissionItemComponent
            key={item.id}
            item={item}
            expandedItems={expandedItems}
            toggleExpanded={toggleExpanded}
            handleToggle={handleToggle}
            isPending={isPending}
          />
        ))}
      </div>
    </div>
  );
}
