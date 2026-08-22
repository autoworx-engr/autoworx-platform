import { redirect } from "next/navigation";
import ConversationsBox from "../../_component/conversations/ConversationsBox";

type TProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    open: string;
    chat: string;
    details: string;
  }>;
};

export default async function MessagePage(props: TProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  if (!params.id) return null;
  if (isNaN(parseInt(params.id))) {
    return redirect(`/404`);
  }
  return (
    <ConversationsBox
      selectedConversation={searchParams.open ?? "SMS"}
      clientId={parseInt(params.id)}
      showChat={searchParams.chat}
      showDetails={searchParams.details}
    />
  );
}
