import { db } from "@/lib/db";
import { AppVersionManager } from "./AppVersionManager";
import type { AppVersionData } from "@/service/app-version/api";

const page = async () => {
  const version = await db.appVersion.findUnique({ where: { id: 1 } });

  const initialData: AppVersionData | null = version
    ? {
        latestVersion: version.latestVersion,
        minSupportedVersion: version.minSupportedVersion,
        forceUpdate: version.forceUpdate,
        message: version.message,
      }
    : null;

  return <AppVersionManager initialData={initialData} />;
};

export default page;
