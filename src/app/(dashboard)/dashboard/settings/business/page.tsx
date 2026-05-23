import { Suspense } from "react";
import Container from "./Container";
import { Spin } from "antd";
import CarLoading from "@/components/common/CarLoading";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Business",
  description: "Manage your business",
};

const BusinessPage = async () => {
  return (
    <div className="h-full w-full md:w-[80%] overflow-y-auto ">
      <div className="">
        {/* account detail */}
        <div className="#w-1/2">
          <h3 className="my-4 text-2xl font-bold text-gray-800 border-b pb-2">
            Account Details
          </h3>
          <Suspense fallback={<CarLoading />}>
            <Container />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default BusinessPage;
