import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendMessengerMessage } from "../_actions/sendMessengerMessage";
import { messengerQueryKey } from "../_utils/queryKey";
import { errorToast } from "@/lib/toast";

type TArgs = {
  clientId: number;
  message?: string;
  attachments?: { url: string; name: string; attachmentType: string }[];
  tempId: string;
};

export default function useMessengerSendMutation(clientId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: TArgs) =>
      sendMessengerMessage({
        clientId: args.clientId,
        message: args.message,
        attachments: args.attachments,
      }),

    onMutate: async (args) => {
      await queryClient.cancelQueries({
        queryKey: messengerQueryKey.allByClientId(clientId),
      });

      const prev = queryClient.getQueryData(
        messengerQueryKey.allByClientId(clientId),
      );

      const optimistic = {
        id: args.tempId,
        clientId: args.clientId,
        message: args.message ?? null,
        sentBy: "Company",
        isRead: true,
        createdAt: new Date().toISOString(),
        attachments: [],
        user: null,
        isSending: true,
      };

      queryClient.setQueryData(
        messengerQueryKey.allByClientId(clientId),
        (old: any) => {
          if (!old?.pages?.length) return old;
          const pages = old.pages.map((page: any, i: number) =>
            i === 0 ? { ...page, data: [optimistic, ...page.data] } : page,
          );
          return { ...old, pages };
        },
      );

      return { prev };
    },

    onError: (_err, _args, context) => {
      errorToast("Failed to send message");
      if (context?.prev) {
        queryClient.setQueryData(
          messengerQueryKey.allByClientId(clientId),
          context.prev,
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: messengerQueryKey.allByClientId(clientId),
      });
    },
  });
}
