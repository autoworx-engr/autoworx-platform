import { Suspense } from "react";
import LeadsClient from "./LeadsClient";
import CarLoading from "@/components/common/CarLoading";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <CarLoading />
        </div>
      }
    >
      <LeadsClient />
    </Suspense>
  );
}
