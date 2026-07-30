import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendInstagramMessage } from "../_actions/sendInstagramMessage";
import { instagramQueryKey } from "../_utils/queryKey";
import { errorToast } from "@/lib/toast";

type TArgs = {
  clientId: number;
  message?: string;
  attachments?: { url: string; name: string; attachmentType: string }[];
  tempId: string;
};

export default function useInstagramSendMutation(clientId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: TArgs) =>
      sendInstagramMessage({
        clientId: args.clientId,
        message: args.message,
        attachments: args.attachments,
      }),

    onMutate: async (args) => {
      await queryClient.cancelQueries({
        queryKey: instagramQueryKey.allByClientId(clientId),
      });

      const prev = queryClient.getQueryData(
        instagramQueryKey.allByClientId(clientId),
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
        instagramQueryKey.allByClientId(clientId),
        (old: any) => {
          if (!old?.pages?.length) return old;
          const pages = old.pages.map((page: any, i: number) =>
            i === 0 ? { ...page, data: [optimistic, ...page.data] } : page,
          );
          return { ...old, pages };
        },
      );

      return { prev, tempId: args.tempId };
    },

    onSuccess: (saved, _args, context) => {
      if (!saved) return;
      queryClient.setQueryData(
        instagramQueryKey.allByClientId(clientId),
        (old: any) => {
          if (!old?.pages?.length) return old;
          const pages = old.pages.map((page: any, i: number) => {
            if (i !== 0) return page;
            const withoutTemp = page.data.filter(
              (m: any) => m.id !== context?.tempId,
            );
            const alreadyPresent = withoutTemp.some(
              (m: any) => m.id === saved.id,
            );
            return {
              ...page,
              data: alreadyPresent ? withoutTemp : [saved, ...withoutTemp],
            };
          });
          return { ...old, pages };
        },
      );
    },

    onError: (err: any, _args, context) => {
      errorToast(err?.message || "Failed to send message");
      if (context?.prev) {
        queryClient.setQueryData(
          instagramQueryKey.allByClientId(clientId),
          context.prev,
        );
      }
    },
  });
}
