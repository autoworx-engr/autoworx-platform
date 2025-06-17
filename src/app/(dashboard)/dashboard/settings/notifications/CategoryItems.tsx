import { getNotificationSettingsByCategory } from "@/actions/settings/notificationSettings";
import { errorHandler } from "@/error-boundary/globalErrorHandler";
import { errorToast } from "@/lib/toast";
import { useGetCurrentUser } from "@/utils/useGetCurrentUser";
import { NotificationSection } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import NotificationTableRow from "./NotificationTableRow";

type TProps = {
  category: NotificationSection;
};

export default function CategoryItems({ category }: TProps) {
  const user = useGetCurrentUser();
  const {
    data: notificationSetting,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["category", category],
    queryFn: () =>
      getNotificationSettingsByCategory({
        section: category,
        userId: Number(user?.id),
        companyId: user?.companyId as number,
      }),
  });

  let content = null;

  if (isLoading && !error) {
    return;
  } else if (!isLoading && error) {
    const formattedError = errorHandler(error);
    errorToast(formattedError.message);
    return;
  } else if (
    !isLoading &&
    !error &&
    notificationSetting &&
    notificationSetting?.length > 0
  ) {
    content = notificationSetting?.map((setting) => (
      <NotificationTableRow key={setting.id} setting={setting} />
    ));
  }

  return (
    <div className="w-full overflow-auto border p-2 sm:w-full">
      <table className="w-full border-separate border-spacing-0 sm:border-spacing-2">
        <thead>
          <tr>
            <td></td>
            <td className="text-sm font-semibold">Email</td>
            <td className="text-sm font-semibold">Push</td>
            <td className="text-sm font-semibold">Text</td>
          </tr>
        </thead>
        <tbody>{content}</tbody>
      </table>
    </div>
  );
}
