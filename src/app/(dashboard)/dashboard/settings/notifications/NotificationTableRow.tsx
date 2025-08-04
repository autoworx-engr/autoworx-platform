"use client";
import { updateNotification } from "@/actions/settings/updateNotification";
import { getNotificationTitle } from "@/lib/notification-permission";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { NotificationSettingsV2 } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import MySwitch from "./MySwitch";
import { getTwilioCredentials } from "@/actions/communication/client/sendMessage";
import { errorToast } from "@/lib/toast";

type TProps = {
  setting: NotificationSettingsV2;
};

type TMutationFnProps = {
  switchKey: "email_enabled" | "push_enabled" | "text_enabled";
  value: boolean;
};

export default function NotificationTableRow({ setting }: TProps) {
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
    <tr className="">
      <td className="capitalize">{settingTitle}</td>
      {setting && (
        <td>
          <MySwitch
            checked={setting["email_enabled"] as boolean}
            onChecked={(value) => mutate({ switchKey: "email_enabled", value })}
          />
        </td>
      )}

      {setting && (
        <td>
          <MySwitch
            checked={setting["push_enabled"] as boolean}
            onChecked={(value) => mutate({ switchKey: "push_enabled", value })}
          />
        </td>
      )}

      {setting && (
        <td>
          <MySwitch
            checked={setting["text_enabled"] as boolean}
            onChecked={async (value) => {
              let twilioCredentials = await getTwilioCredentials();
              if (!twilioCredentials && value) {
                errorToast(
                  "Twilio credentials not found, set credentials first",
                );
                return;
              }
              mutate({ switchKey: "text_enabled", value });
            }}
          />
        </td>
      )}
    </tr>
  );
}
