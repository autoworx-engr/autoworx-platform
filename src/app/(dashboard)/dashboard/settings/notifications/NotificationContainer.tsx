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

  console.log({ openService });
  return (
    <div className="grid-col-1 grid w-full gap-8 sm:grid-cols-2">
      {sections.map((category) => (
        <NotificationServiceContainer
          key={category}
          category={category}
          title={getNotificationTitle(category)}
          openService={openService}
          setOpenService={setOpenService}
        />
      ))}
    </div>
  );
}
