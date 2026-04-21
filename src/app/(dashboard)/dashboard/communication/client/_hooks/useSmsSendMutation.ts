import { sendInfobipMessage } from "@/actions/communication/client/sendInfobipMessage";
import { sendTwilioMessage } from "@/actions/communication/client/sendTwilioMessage";
import { errorToast } from "@/lib/toast";
import { isAudio } from "../_utils";
import { ClientSMS, SmsGateway } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { smsQueryKey } from "../_utils/queryKey";

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
      smsGateway: SmsGateway;
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
      const attachments = mediaUrl.map((url, ind) => ({
        url,
        name: files[ind].name,
        isVoiceNote:
          isAudio(files[ind].name) || files[ind].type.startsWith("audio/"),
      }));

      let response;
      if (clientSmsData.smsGateway === "TWILIO") {
        response = await sendTwilioMessage({
          clientId: clientSmsData.clientId,
          message: clientSmsData.message,
          attachments,
        });
      } else if (clientSmsData.smsGateway === "INFOBIP") {
        response = await sendInfobipMessage({
          clientId: clientSmsData.clientId,
          message: clientSmsData.message,
          attachments,
        });
      }
      return response;
    },

    // 🔁 Optimistic update
    onMutate: async (newClientSms) => {
      await queryClient.cancelQueries({
        queryKey: smsQueryKey.allSmsByClientId(newClientSms.clientId),
      });

      let previousClientSms = queryClient.getQueryData(
        smsQueryKey.allSmsByClientId(newClientSms.clientId),
      );

      const optimisticMessage = {
        id: newClientSms.id,
        clientId: newClientSms.clientId,
        message: newClientSms.message,
        attachments: newClientSms.files.map((file) => ({
          name: file.name,
          url: URL.createObjectURL(file), // Temporary blob URL
          isVoiceNote: isAudio(file.name) || file.type.startsWith("audio/"),
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
              index: number,
            ) => {
              if (index === 0) {
                return {
                  ...page,
                  data: updatedLastPageMessages,
                };
              }
              return page;
            },
          );
          return {
            ...oldData,
            pages: updatedPages,
          };
        },
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
        context?.previousClientSms,
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
