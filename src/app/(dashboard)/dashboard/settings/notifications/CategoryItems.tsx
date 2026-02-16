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
      <NotificationTableRow isPayment={category === "PAYMENT"} key={setting.id} setting={setting} />
    ));
  }


  return (
    <div className="w-full overflow-auto px-5 py-3">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <td></td>
            <td className="pb-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
              Email
            </td>
            <td className="pb-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
              Push
            </td>
            {category === "PAYMENT" && (
              <td className="pb-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                Text
              </td>
            )}
          </tr>
        </thead>
        <tbody>{content}</tbody>
      </table>
    </div>
  );
}
