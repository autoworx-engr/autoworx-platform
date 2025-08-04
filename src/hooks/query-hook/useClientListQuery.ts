import getClientList from '@/actions/client/getClientList';
import { queryKeys } from '@/lib/queryKeys';
import { useQuery } from '@tanstack/react-query';

export default function useClientListQuery(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: [queryKeys.clientList],
        queryFn: async () => {
            return getClientList({
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    photo: true,
                    isFleet: true,
                    Lead: {
                        select: {
                            id: true,
                            companyId: true,
                            columnId: true,
                        },
                    },
                    mobile: true,
                },
            });
        },
        enabled: options?.enabled ?? true,
    });
}
