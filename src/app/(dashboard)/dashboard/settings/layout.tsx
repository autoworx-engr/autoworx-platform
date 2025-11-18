import React from "react";
import Sidebar from "./Sidebar";
import { Settings } from "lucide-react";

type Props = {
  children: React.ReactNode;
};

const layout = ({ children }: Props) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Clean Header matching dashboard theme */}
      <div className="bg-background border-b border-slate-200/80">
        <div className="px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800 shadow-sm">
              <Settings className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className=" py-6">
        <div className="flex gap-6 items-start">
          {/* Sidebar */}
          <Sidebar />

          {/* Content Area - Same white background as sidebar */}
          <div className="flex-1 min-w-0 ">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default layout;
