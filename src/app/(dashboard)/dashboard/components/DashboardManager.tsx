import React from "react";
import AppointmentListBox from "./box/AppointmentListBox";
import EmployeeLeaveRequestsBox from "./box/EmployeeLeaveRequestsBox";
import EmployeePayoutBox from "./box/EmployeePayoutBox";
import InventoryBox from "./box/InventoryBox";
import ReputationBox from "./box/ReputationBox";
import RevenueBox from "./box/RevenueBox";
import SalesPipelineBox from "./box/SalesPipelineBox";
import ShopPipelineBox from "./box/ShopPipelineBox";
import TaskListBox from "./box/TaskListBox";

const DashboardColumn = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`flex flex-col gap-2 h-full max-h-[90vh] ${className}`}>
    {children}
  </div>
);

const DashboardManager = () => {
  return (
    <div className="max-h-[90vh] h-full w-full bg-slate-50 p-2 lg:p-3">
      <div className="grid w-full h-full grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 items-stretch">

        <DashboardColumn>
          <SalesPipelineBox />
          <ShopPipelineBox />
        </DashboardColumn>

        <DashboardColumn>
          <div className="min-h-[25rem] lg:max-h-[90vh] md:h-full flex-1 lg:min-h-0">
            <TaskListBox />
          </div>
          <div className="hidden lg:block h-[30rem] flex-1 min-h-0">
            <AppointmentListBox />
          </div>
          <div className="lg:hidden flex-grow">
            <ReputationBox />
          </div>
        </DashboardColumn>

        <DashboardColumn className="sm:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <RevenueBox />
            <InventoryBox className="h-full" />
          </div>

          <div className="h-full">
            <EmployeePayoutBox className="h-full" />
          </div>

          <div className="h-full">
            <div className="hidden lg:block h-full">
              <ReputationBox />
            </div>
            <div className="h-[30rem] lg:hidden lg:h-full">
              <AppointmentListBox />
            </div>
          </div>
        </DashboardColumn>
      </div>
    </div>
  );
};

export default DashboardManager;