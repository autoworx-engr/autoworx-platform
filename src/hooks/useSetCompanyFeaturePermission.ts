import { useCompanyFeaturePermissionStore } from "@/stores/companyFeaturePermissionStore";

import { Session } from "next-auth";
import { useEffect } from "react";
import { useGetCompanyPermissions } from "./feature-permissions/useGetCompanyPersmissions";

export function useSetCompanyFeaturePermission(
  session: (Session & { user: { employeeType: string } }) | null,
) {
  const { setCompanyFeaturePermission, setLoading  } = useCompanyFeaturePermissionStore();

  const { data, isLoading } = useGetCompanyPermissions(Number(session?.user.companyId));

  useEffect(()=>{
    if(isLoading) {
      setLoading(true)
    }
  }, [isLoading, setLoading])
  useEffect(() => {
    if (data && !isLoading) setCompanyFeaturePermission(data?.data);
  }, [session, data, isLoading]);

  return {
    isLoading:isLoading
  }
}
