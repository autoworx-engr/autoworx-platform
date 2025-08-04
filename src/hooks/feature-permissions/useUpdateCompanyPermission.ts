import { errorToast, successToast } from '@/lib/toast';
import { updatePermission } from '@/service/feature-permissions/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface PermissionUpdate {
  permission_name: string;
  enabled: boolean;
  companyId: number;
}

export const useUpdateCompanyPermission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['updatePermission'],
    mutationFn: async (updates: PermissionUpdate[]) => {
      return await Promise.all(
        updates.map((u) =>
          updatePermission(u.companyId, u.permission_name, u.enabled)
        )
      );
    },
    onSuccess: () => {
      successToast('Permissions updated successfully!');
      // queryClient.invalidateQueries({ queryKey: ['companyPermissions'] });
    },
    onError: (error) => {
      errorToast('Failed to update permissions!');
      console.error('Update error:', error);
    },
  });
};
