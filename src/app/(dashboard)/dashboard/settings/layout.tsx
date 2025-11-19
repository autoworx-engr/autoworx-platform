import React from "react";
import Sidebar from "./Sidebar";

type Props = {
  children: React.ReactNode;
};

const layout = ({ children }: Props) => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <h1 className="mb-6 ml-1 text-3xl font-bold text-gray-800">Settings</h1>
      
      {/* Main content area: Sidebar and Page Content */}
      <div className="flex flex-col lg:flex-row lg:space-x-8">
        
        {/* Sidebar takes its specific width and is sticky on desktop */}
        <div className="lg:w-[320px] lg:shrink-0">
          <Sidebar />
        </div>

        {/* Content area takes the remaining space */}
        <main className="w-full min-h-[70vh] rounded-xl bg-white p-4 sm:p-6 lg:p-8 shadow-md lg:mt-0 mt-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default layout;
