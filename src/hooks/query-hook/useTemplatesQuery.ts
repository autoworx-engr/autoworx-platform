import getTemplates from "@/actions/task/getTemplates";
import { emailTemplateQueryKey } from "@/app/(dashboard)/dashboard/task/_constant";
import { useQuery } from "@tanstack/react-query";

export default function useTemplatesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [emailTemplateQueryKey.templates],
    queryFn: async () => {
      return getTemplates();
    },
    enabled: options?.enabled ?? true,
  });
}
