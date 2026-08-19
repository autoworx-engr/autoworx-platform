"use client";

import { canAccessRoute, canAccessWithFeatureKey } from "@/lib/routeAccess";
import { resolveRouteFeatureKey } from "@/lib/routePermissionsMap";
import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { Spin } from "antd";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
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

  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.replace("/login");
    }
  }, [status]);

  // Combine the pathname + search
  const params = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  const fullPath = `${pathname}${params}`;

  // 1. Check company feature permission first. `resolveRouteFeatureKey` returns
  // undefined for routes gated at page level via entitlements (visualization,
  // sales-agent settings) so users see the upgrade prompt instead of a 404.
  const featureKey = resolveRouteFeatureKey(fullPath);
  if (!canAccessWithFeatureKey(featureKey, companyFeaturePermission)) {
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
