"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/(dashboard)/dashboard/estimate/TabsNav";
import { useEstimateNavigationStore } from "@/stores/estimateNavigationStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface NavigationsTabProps {
  activeTab: string;
  children: React.ReactNode;
}
export default function NavigationTabs({
  activeTab,
  children,
}: Readonly<NavigationsTabProps>) {
  const router = useRouter();
  const setType = useEstimateNavigationStore((state) => state.setType);
  const resetType = useEstimateNavigationStore((state) => state.resetType);

  useEffect(() => {
    // Prefetch the dashboard page
    router.prefetch("/dashboard/estimate/canned");
    router.prefetch("/dashboard/estimate/invoices");
    router.prefetch("/dashboard/estimate");
  }, [router]);
  const handleCannedClick = () => {
    resetType(); // or another appropriate value
    // router.push("/dashboard/estimate/canned");
  };

  const handleInvoiceClick = () => {
    setType("invoice");
    // router.push("/dashboard/estimate/invoices");
  };

  const handleEstimateClick = () => {
    setType("estimate");
    // router.push("/dashboard/estimate");
  };

  return (
  
     <Tabs defaultValue={activeTab} className="mt-5 h-full overflow-hidde">
      <TabsList>
        <Link href="/dashboard/estimate/canned">
          <TabsTrigger
            className=""
            value="c-canned"
            onClick={handleCannedClick}
          >
            Canned
          </TabsTrigger>
        </Link>
        <Link href="/dashboard/estimate/invoices">
          <TabsTrigger value="b-invoice" onClick={handleInvoiceClick}>
            Invoices
          </TabsTrigger>
        </Link>
        <Link href="/dashboard/estimate">
          <TabsTrigger value="a-estimate" onClick={handleEstimateClick}>
            Estimates
          </TabsTrigger>
        </Link>
      </TabsList>
      <div className="flex-auto min-h-[calc(100vh-185px)] overflow-x-clip rounded-lg bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:p-4">
        <TabsContent className="h-full" value={activeTab}>
          {children}
        </TabsContent>
      </div>
    </Tabs>
   
  );
}
