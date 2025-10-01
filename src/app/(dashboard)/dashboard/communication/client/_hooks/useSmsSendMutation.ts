import { sendTwilioMessage } from "@/actions/communication/client/sendTwilioMessage";
import { errorToast } from "@/lib/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { smsQueryKey } from "../_utils/queryKey";
import updateFirstContactTimeClient from "@/actions/communication/client/updateFirstContactTimeClient";
import { ClientSMS } from "@prisma/client";
import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";

export default function useSmsSendMutation(clientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientSmsData: {
      id: string;
      clientId: number;
      message: string;
      files: File[];
      createdAt: string;
      isSending: boolean;
      sentBy: string;
    }) => {
      const { files } = clientSmsData;
      let mediaUrl: string[] = [];

      if (files.length > 10) {
        errorToast("Maximum 10 files are allowed in a single message");
        throw new Error("Maximum 10 files are allowed in a single message");
      }

      if (files.length > 0) {
        const formData = new FormData();
        for (const file of files) formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();
        if (json?.data?.length > 0) {
          mediaUrl = json?.data;
        }
      }
      const response = await sendInfobipMessage({
        clientId: clientSmsData.clientId,
        message: clientSmsData.message,
        attachments: mediaUrl.map((file, ind) => ({
          url: file,
          name: files[ind].name,
        })),
      });
      return response;
    },

    // 🔁 Optimistic update
    onMutate: async (newClientSms) => {
      await queryClient.cancelQueries({
        queryKey: smsQueryKey.allSmsByClientId(newClientSms.clientId),
      });

      let previousClientSms = queryClient.getQueryData(
        smsQueryKey.allSmsByClientId(newClientSms.clientId)
      );

      const optimisticMessage = {
        id: newClientSms.id,
        clientId: newClientSms.clientId,
        message: newClientSms.message,
        attachments: newClientSms.files.map((file) => ({
          name: file.name,
          url: URL.createObjectURL(file), // Temporary blob URL
        })),
        createdAt: new Date().toISOString(),
        isSending: true,
        sentBy: "Company",
      };

      queryClient?.setQueryData(
        smsQueryKey.allSmsByClientId(clientId),
        (oldData: any) => {
          if (!oldData) return oldData;
          if (oldData.pages.length === 0) return oldData;
          const initialPage = oldData.pages[0];
          const updatedLastPageMessages = [
            optimisticMessage,
            ...initialPage.data,
          ];
          const updatedPages = oldData.pages.map(
            (
              page: {
                data: ClientSMS[];
                total: number;
                nextPage: number;
                hasMore: boolean;
              },
              index: number
            ) => {
              if (index === 0) {
                return {
                  ...page,
                  data: updatedLastPageMessages,
                };
              }
              return page;
            }
          );
          return {
            ...oldData,
            pages: updatedPages,
          };
        }
      );

      return { previousClientSms };
    },

    // ❌ Rollback on error
    onError: (err, newTodo, context) => {
      console.error("Error updating appointment:", err);
      console.log("context", context);
      // Rollback day page appointments
      queryClient.setQueryData(
        smsQueryKey.allSmsByClientId(clientId),
        context?.previousClientSms
      );
    },

    // ✅ Refetch after success or error
    onSettled: () => {
      // Invalidate day page appointments
      queryClient.invalidateQueries({
        queryKey: smsQueryKey.allSmsByClientId(clientId),
      });
    },
  });
}
