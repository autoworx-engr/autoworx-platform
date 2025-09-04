import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import NotificationContainer from "./NotificationContainer";
import NotificationPermissionAlert from "./NotificationPermissionAlert";

const NotificationSettingPage = async () => {
  const user = await getUser();
  const notificationSections = await db.notificationSettingsV2.findMany({
    where: {
      userId: user?.id,
    },
    select: {
      section: true,
    },
  });

  const uniqueSections = Array.from(
    new Set(notificationSections.map((section) => section.section)),
  );

  
  return (
    <div className="flex w-full flex-col">
      <NotificationPermissionAlert />
      <div className="h-full w-full overflow-y-auto p-8">
        <h3 className="my-4 text-lg font-bold">
          Overall Notification Settings
        </h3>
        <h3 className="my-4 text-lg italic">
          Toggle between email, push and silenced notifications for the
          following
        </h3>
        <NotificationContainer sections={uniqueSections} />
      </div>
    </div>
  );
};

export default NotificationSettingPage;
