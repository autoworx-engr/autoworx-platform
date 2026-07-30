import { db } from "@/lib/db";
import getUser from "@/lib/getUser";
import NotificationContainer from "./NotificationContainer";
import NotificationPermissionAlert from "./NotificationPermissionAlert";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Notifications",
  description: "Manage your notifications",
};

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
      <div className="h-full w-full overflow-y-auto md:px-8 py-4">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-600">
            Overall Notification Settings
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Toggle between email, push and silenced notifications for the
            following
          </p>
        </div>
        <NotificationContainer sections={uniqueSections} />
      </div>
    </div>
  );
};

export default NotificationSettingPage;
