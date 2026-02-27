"use client";
import { getNotificationTitle } from "@/lib/notification-permission";
import NotificationServiceContainer from "./NotificationServiceContainer";

import { NotificationSection } from "@prisma/client";
import { useState } from "react";

const initialOpenServiceState = (
  notificationSections: NotificationSection[],
) => {
  return notificationSections.reduce(
    (acc, category) => {
      acc[category] = false;
      return acc;
    },
    {} as { [key: string]: boolean },
  );
};

type TProps = {
  sections: NotificationSection[];
};

export default function NotificationContainer({ sections }: TProps) {
  const [openService, setOpenService] = useState(
    initialOpenServiceState(sections),
  );

  return (
    <div className="flex w-full flex-col items-start gap-6 sm:flex-row">
      <div className="flex w-full flex-1 flex-col gap-4">
        {sections.slice(0, 4).map((category) => (
          <NotificationServiceContainer
            key={category}
            category={category}
            title={getNotificationTitle(category)}
            openService={openService}
            setOpenService={setOpenService}
          />
        ))}
      </div>
      <div className="flex w-full flex-1 flex-col gap-4">
        {sections.slice(4, 8).map((category) => (
          <NotificationServiceContainer
            key={category}
            category={category}
            title={getNotificationTitle(category)}
            openService={openService}
            setOpenService={setOpenService}
          />
        ))}
      </div>
    </div>
  );
}
