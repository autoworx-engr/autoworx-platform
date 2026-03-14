"use client";

import { canAccessRoute } from "@/lib/routeAccess";
import { FEATURE_PERMISSIONS_MAP } from "@/lib/routePermissionsMap";
import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { Spin } from "antd";
import { Session } from "next-auth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CarLoading from "./common/CarLoading";

type TProps = {
  children: React.ReactNode;
  session: (Session & { user: { employeeType: string } }) | null;
};

export default function PrivateRoute({ children, session }: TProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Grab the user’s permissions from Zustand
  const { permissions } = usePermissionStore();
  const { companyFeaturePermission } = useCompanyFeaturePermissionStore();

  // Helper: Check if company feature permission allows access to this route
  function canAccessCompanyFeatureRoute(route: string): boolean {
    if (!companyFeaturePermission || companyFeaturePermission.length === 0)
      return true;
    const routeWithoutQuery = route.split("?")[0];

    // Visualization is gated at page level via entitlements so users can see
    // the upgrade prompt instead of being hard-redirected to 404.
    if (routeWithoutQuery === "/dashboard/visualization") return true;

    const featureKey = FEATURE_PERMISSIONS_MAP[routeWithoutQuery];
    if (!featureKey) return true;
    if (Array.isArray(featureKey)) {
      return featureKey.some((key) =>
        companyFeaturePermission.some(
          (perm) => perm.permission_name === key && perm.enabled,
        ),
      );
    }
    return companyFeaturePermission.some(
      (perm) => perm.permission_name === featureKey && perm.enabled,
    );
  }

  // Combine the pathname + search
  const params = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  const fullPath = `${pathname}${params}`;

  // 1. Check company feature permission first
  if (!canAccessCompanyFeatureRoute(fullPath)) {
    router.replace("/404");
    return null;
  }

  // 2. Then check general route access (user permissions)
  if (!permissions) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <CarLoading />
      </div>
    );
  }

  if (!canAccessRoute(fullPath, permissions)) {
    router.replace("/404");
    return null;
  }

  return <>{children}</>;
}
