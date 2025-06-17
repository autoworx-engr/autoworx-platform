import { redirect } from "next/navigation";
import ConversationsBox from "../../_component/conversations/ConversationsBox";

type TProps = {
  params: { id: string };
  searchParams: {
    open: string;
    chat: string;
    details: string;
  };
};

export default function MessagePage({ params, searchParams }: TProps) {
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
