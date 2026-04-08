import getTemplateList from "@/actions/estimate-template/getTemplateList";
import { queryKeys } from "@/lib/queryKeys";
import { useQuery } from "@tanstack/react-query";

export default function useTemplateListInfiniteQuery(search?: string) {
  return useQuery({
    queryKey: [queryKeys.templateList, "infinite", search],
    queryFn: async () => {
      const { templates } = await getTemplateList(search);

      return templates;
    },
  });
}
