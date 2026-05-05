import { redirect } from "next/navigation";
import DetailsBox from "../../_component/details/DetailsBox";

type TProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    details: string;
  }>;
};

export default async function DetailsPage(props: TProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  if (isNaN(parseInt(params.id))) {
    return redirect(`/404`);
  }
  return (
    <div className="px-2 lg:px-0">
      <DetailsBox
        clientId={parseInt(params.id)}
        showDetails={searchParams.details}
      />
    </div>
  );
}
