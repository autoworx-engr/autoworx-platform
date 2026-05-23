"use client";
import Title from "@/components/Title";
import HeaderSearch from "./components/HeaderSearch";
import {
  PaymentTab,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./components/PaymentTab";
import PaymentTable from "./components/PaymentTable";
import { useState } from "react";
import { Clock } from "lucide-react";

export default function Page() {
  const [activeTab, setActiveTab] = useState("transactions");

  // const { data: couponsData } = useServerGet(getCoupons);
  // const [coupons, setCoupons] = useState(couponsData);

  // useEffect(() => {
  //   setCoupons(couponsData);
  // }, [couponsData]);

  return (
    <div>
      <Title>Payments</Title>

      {/* Header */}
      <div className="mt-5 flex justify-between">
        <HeaderSearch activeTab={activeTab} />
      </div>

      <PaymentTab
        defaultValue="transactions"
        className="mt-5 grid-cols-1"
        onValueChange={setActiveTab}
      >
        <TabsList>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          {/* <TabsTrigger value="integrations">Integrations</TabsTrigger> */}
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <PaymentTable />
        </TabsContent>

        {/* <TabsContent value="integrations">
          <div className="grid grid-cols-1 justify-evenly gap-y-4 md:flex">
            <LogoCard />
            <LogoCard />
            <LogoCard />
          </div>
        </TabsContent> */}

        <TabsContent
          value="coupons"
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "transparent",
            padding: 0,
          }}
        >
          {/* <CuponComponent coupons={coupons || []} setCoupons={setCoupons} /> */}

          <div className="flex min-h-[65vh] flex-col items-center justify-center rounded-md bg-background p-8">
            <div className="w-full max-w-2xl text-center">
              <div className="mb-4 flex items-center justify-center">
                <Clock
                  strokeWidth={3}
                  className="mr-2 text-blue-500"
                  size={30}
                />
                <h2 className="text-xl font-bold text-gray-800 md:text-2xl">
                  Coupons Coming Soon
                </h2>
              </div>

              <div className="mx-auto mb-6 h-1 w-24 bg-blue-500"></div>

              <p className="mb-4 text-gray-600">
                We{"'"}re currently developing coupon management system to help
                you create and track promotional offers for your customers.
              </p>

              <p className="text-gray-600">
                This feature will be available in the near future. Thank you for
                your patience as we work to enhance your experience.
              </p>
            </div>
          </div>
        </TabsContent>
      </PaymentTab>
    </div>
  );
}
