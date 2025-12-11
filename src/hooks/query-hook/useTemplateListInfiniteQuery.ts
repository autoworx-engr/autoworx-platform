import getTemplateList from "@/actions/estimate-template/getTemplateList";
import { queryKeys } from "@/lib/queryKeys";
import { useInfiniteQuery } from "@tanstack/react-query";

const PAGE_SIZE = 20;

export default function useTemplateListInfiniteQuery(search?: string) {
  return useInfiniteQuery({
    queryKey: [queryKeys.templateList, "infinite", search],
    queryFn: async ({ pageParam = 0 }) => {
      const { templates } = await getTemplateList(
        {
          skip: pageParam * PAGE_SIZE,
          take: PAGE_SIZE,
          orderBy: {
            createdAt: "desc",
          },
        },
        search
      );

      return {
        templates,
        nextPage: templates.length === PAGE_SIZE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });
}
