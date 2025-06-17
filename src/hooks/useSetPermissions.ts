import getPermissions from "@/lib/getPermissions";
import { usePermissionStore } from "@/stores/permissionStore";

import { Session } from "next-auth";
import { useEffect } from "react";

export function useSetPermissions(
  session: (Session & { user: { employeeType: string } }) | null,
) {
  const { setPermissions } = usePermissionStore();

  useEffect(() => {
    getPermissions().then((permissions) => {
      if (permissions) setPermissions(permissions);
    });
  }, [session, setPermissions]);
}
