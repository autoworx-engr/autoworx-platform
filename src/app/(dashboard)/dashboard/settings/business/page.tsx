import { Suspense } from "react";
import Container from "./Container";
import { Spin } from "antd";

const BusinessPage = async () => {
  return (
   <div className="h-full w-full md:w-[80%] overflow-y-auto ">
      <div className="">
        {/* account detail */}
        <div className="#w-1/2">
          <h3 className="my-4 text-2xl font-bold text-gray-800 border-b pb-2">
            Account Details ⚙️
          </h3>
          <Suspense
            fallback={
              <Spin
                size="large"
                className="flex w-full items-center justify-center"
                style={{ height: "80vh" }}
              />
            }
          >
            <Container />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default BusinessPage;
