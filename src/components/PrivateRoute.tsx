"use client";

import { canAccessRoute } from "@/lib/routeAccess";
import { usePermissionStore } from "@/stores/permissionStore";
import { Spin } from "antd";
import { Session } from "next-auth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
 
  if (!permissions) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }
  // Combine the pathname + search
  const params = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  const fullPath = `${pathname}${params}`;

  if (!canAccessRoute(fullPath, permissions)) {
    router.replace("/404");
    return null;
  }

  return <>{children}</>;
}
