"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function SwitchDashboard() {
  const session = useSession();
  const path = usePathname();

  const isAdmin = session?.data?.user?.isSuperAdmin;
  const isAwxDashboard = isAdmin && path.startsWith("/awx-dashboard");
  const isUserDashboard =
    isAdmin &&
    path.startsWith("/dashboard") &&
    !path.startsWith("/awx-dashboard");

  return (
    <div className="flex items-center gap-x-5">
      {isUserDashboard && (
        <Link href={"/awx-dashboard"}>
          <RefreshCw className="h-5 w-5 sm:h-7 sm:w-7 mr-2 text-white sm:text-[#6571FF] cursor-pointer" />
        </Link>
      )}
      {isAwxDashboard && (
        <Link
          href={"/dashboard"}
          onClick={() =>
            setTimeout(() => {
              window.location.reload();
            }, 2000)
          }
        >
          <RefreshCw className="h-5 w-5 sm:h-7 sm:w-7 mr-2 text-white sm:text-[#6571FF] cursor-pointer" />
        </Link>
      )}
    </div>
  );
}
