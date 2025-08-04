import { redirect } from "next/navigation";
import DetailsBox from "../../_component/details/DetailsBox";

type TProps = {
  params: {
    id: string;
  };
  searchParams: {
    details: string;
  };
};

export default function DetailsPage({ params, searchParams }: TProps) {
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
