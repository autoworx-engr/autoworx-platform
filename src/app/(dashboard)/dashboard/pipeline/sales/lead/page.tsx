import { getColumnsByType } from "@/actions/pipelines/pipelinesColumn";
import Leads from "../../components/Leads";

export default async function page() {
  // const leadsData = await getLeads();
  const columns = await getColumnsByType("sales");
  return <Leads salesColumn={columns} />;
}
