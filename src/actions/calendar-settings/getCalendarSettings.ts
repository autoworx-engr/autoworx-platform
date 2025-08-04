import { authOptions } from "@/authOptions";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";

export const getCalendarSettings = async () => {
  const session = await getServerSession(authOptions);
  const companyId = session?.user.companyId;

  const calendarSettings = await db.calendarSettings.findFirst({
    where: { companyId },
  });

  return calendarSettings;
};
