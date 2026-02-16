"use client";
import { updateNotification } from "@/actions/settings/updateNotification";
import { getNotificationTitle } from "@/lib/notification-permission";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { NotificationSettingsV2 } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import MySwitch from "./MySwitch";
import { getTwilioCredentials } from "@/actions/communication/client/sendTwilioMessage";
import { errorToast } from "@/lib/toast";
import { isSmsAvailable } from "@/actions/communication/client/createTwilioCredentials";

type TProps = {
  setting: NotificationSettingsV2;
  isPayment?: boolean;
};

type TMutationFnProps = {
  switchKey: "email_enabled" | "push_enabled" | "text_enabled";
  value: boolean;
};

export default function NotificationTableRow({
  setting,
  isPayment = false,
}: TProps) {
  const settingTitle = getNotificationTitle(setting.notification_type || "");
  const user = useGetCurrentUser();

  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: ({ switchKey, value }: TMutationFnProps) => {
      return updateNotification({
        userId: Number(user?.id),
        section: setting.section!,
        notificationType: setting.notification_type!,
        switchKey,
        value,
      });
    },
    onSuccess: ({ type, data }) => {
      if (type === "success") {
        queryClient.setQueryData(["category", data.section], (oldData: any) => {
          return oldData.map((oldSetting: any) => {
            if (oldSetting.id === data.id) {
              return data;
            }
            return oldSetting;
          });
        });
      }
    },
  });

  return (
    <tr className="group transition-colors duration-150 hover:bg-gray-50/50">
      <td className="py-2.5 pr-4 text-sm capitalize text-gray-600">
        {settingTitle}
      </td>
      {setting && (
        <td className="py-2.5 text-center">
          <div className="flex justify-center">
            <MySwitch
              checked={setting["email_enabled"] as boolean}
              onChecked={(value) =>
                mutate({ switchKey: "email_enabled", value })
              }
            />
          </div>
        </td>
      )}

      {setting && (
        <td className="py-2.5 text-center">
          <div className="flex justify-center">
            <MySwitch
              checked={setting["push_enabled"] as boolean}
              onChecked={(value) =>
                mutate({ switchKey: "push_enabled", value })
              }
            />
          </div>
        </td>
      )}

      {setting && isPayment && (
        <td className="py-2.5 text-center">
          <div className="flex justify-center">
            <MySwitch
              checked={setting["text_enabled"] as boolean}
              onChecked={async (value) => {
                let twilioCredentials = await isSmsAvailable();
                if (!twilioCredentials && value) {
                  errorToast("SMS gateway not available");
                  return;
                }
                mutate({ switchKey: "text_enabled", value });
              }}
            />
          </div>
        </td>
      )}
    </tr>
  );
}
