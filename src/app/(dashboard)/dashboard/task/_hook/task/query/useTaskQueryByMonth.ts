import { useQuery } from "@tanstack/react-query";
import { taskQueryKey } from "../../../_constant";
import getTasks from "@/actions/task/getTasks";
import moment from "moment";

export default function useTaskQueryByMonth(month: string, year: number) {
  const monthNumber = moment(month, "MMMM").month() + 1;
  const startDate = moment(`${year}-${monthNumber}-01`)
    .startOf("month")
    .format("YYYY-MM-DD");
  const endDate = moment(`${year}-${monthNumber}-01`)
    .endOf("month")
    .format("YYYY-MM-DD");
  return useQuery({
    queryKey: [taskQueryKey.allTasks, startDate, endDate],
    queryFn: async () => {
      const response = await getTasks({
        where: {
          date: {
            gte: `${startDate}T00:00:00.000Z`,
            lte: `${endDate}T23:59:59.999Z`,
          },
          AND: [{ startTime: { not: null } }, { endTime: { not: null } }],
        },
      });
      return response.data;
    },
  });
}
