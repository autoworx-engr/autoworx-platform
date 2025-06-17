import { getSalesPipelineLeadsCount } from "@/actions/pipelines/getSalesPipelineLeadsCount";
import { usePipelineFilterStore } from "@/stores/PipelineFilterStore";
import { salesPipelineQueryKeys } from "@/utils/enums/query-key-constant";
import { useQuery } from "@tanstack/react-query";

type TProps = {
  title: string;
  columnId: number;
};

export default function PipelineTitle({ title, columnId }: TProps) {
  const searchTerm = usePipelineFilterStore((state) => state.searchTerm);
  const {
    data: leadsCount,
    isLoading,
    isError,
    isFetching,
  } = useQuery({
    queryKey: salesPipelineQueryKeys
      .getLeadsCountKey(columnId)
      .concat(searchTerm ?? ""),
    queryFn: () => {
      return getSalesPipelineLeadsCount(columnId);
    },
    refetchOnWindowFocus: false,
  });

  let countText = "";
  if ((isLoading || isFetching) && !isError) {
    countText = "Loading...";
  } else if (!isLoading && isError) {
    countText = "0";
  } else if (!isLoading && !isError) {
    countText = leadsCount?.toString() ?? "0";
  }
  return (
    <h2 className="rounded-t-lg bg-[#6571FF] px-4 py-3 text-center text-white">
      <p className="text-base font-bold">
        {title ?? ""}
        <span className="ml-2 rounded-lg bg-[#3F49B9] px-2">{countText}</span>
      </p>
    </h2>
  );
}
