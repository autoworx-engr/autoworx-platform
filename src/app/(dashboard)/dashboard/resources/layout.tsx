import React from "react";
import Sidebar from "./Sidebar";

type Props = {
  children: React.ReactNode;
};

const layout = ({ children }: Props) => {
  return (
    <div>
      <h1 className="my-4 ml-4 text-3xl font-bold">Modules</h1>
      <div className="relative md:flex md:items-start space-x-0 sm:space-x-4 lg:space-x-12">
        <Sidebar />
        <div className="lg:pr-10 xl:pr-16 2xl:pr-20 p-4 lg:max-h-[80vh] overflow-y-auto rounded-md">
          {children}
        </div>
      </div>
    </div>
  );
};

export default layout;
