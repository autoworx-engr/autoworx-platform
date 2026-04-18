import { sendMetaMessage } from "@/actions/meta/sendMessage";
import { errorToast } from "@/lib/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { metaQueryKey } from "../_utils/queryKey";

/**
 * TanStack Query mutation hook for sending a Meta message (Instagram or Facebook).
 *
 * Flow:
 * 1. Uploads any attached files to `/api/upload` and collects the CDN URLs
 * 2. Calls `sendMetaMessage` server action with text + attachment URLs
 * 3. Applies an optimistic update that immediately prepends a placeholder
 *    message to the cache so the UI feels instant
 * 4. Rolls back the optimistic message on error, showing an error toast
 * 5. Always invalidates the cache on settle to sync with the DB state
 *
 * Mirrors `useSmsSendMutation` exactly.
 *
 * @param clientId - Client to send the message to (used as the cache key)
 */
export default function useMetaSendMutation(clientId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      clientId: number;
      message: string;
      platform: "INSTAGRAM" | "FACEBOOK";
      files: File[];
    }) => {
      const { files, message, platform } = payload;

      let uploadedAttachments: { url: string; name: string; type: string }[] =
        [];

      if (files.length > 0) {
        const formData = new FormData();
        for (const file of files) formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (json?.data?.length > 0) {
          uploadedAttachments = (json.data as string[]).map((url, i) => ({
            url,
            name: files[i].name,
            type: files[i].type.split("/")[0] || "file",
          }));
        }
      }

      return sendMetaMessage({
        clientId: payload.clientId,
        message,
        platform,
        attachments: uploadedAttachments,
      });
    },

    // Optimistic update — mirrors useSmsSendMutation exactly
    onMutate: async (newMessage) => {
      await queryClient.cancelQueries({
        queryKey: metaQueryKey.allByClientId(newMessage.clientId),
      });

      const previous = queryClient.getQueryData(
        metaQueryKey.allByClientId(newMessage.clientId),
      );

      const optimistic = {
        id: newMessage.id,
        clientId: newMessage.clientId,
        message: newMessage.message,
        platform: newMessage.platform,
        sentBy: "Company",
        isRead: true,
        isSending: true,
        attachments: newMessage.files.map((f) => ({
          name: f.name,
          url: URL.createObjectURL(f),
          type: f.type.split("/")[0] || "file",
        })),
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData(
        metaQueryKey.allByClientId(clientId),
        (oldData: any) => {
          if (!oldData || oldData.pages.length === 0) return oldData;
          const [first, ...rest] = oldData.pages;
          return {
            ...oldData,
            pages: [{ ...first, data: [optimistic, ...first.data] }, ...rest],
          };
        },
      );

      return { previous };
    },

    onError: (_err, payload, context) => {
      errorToast("Error sending message");
      queryClient.setQueryData(
        metaQueryKey.allByClientId(clientId),
        context?.previous,
      );
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: metaQueryKey.allByClientId(clientId),
      });
    },
  });
}
