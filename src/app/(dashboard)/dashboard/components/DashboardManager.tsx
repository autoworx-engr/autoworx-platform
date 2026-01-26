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
  <div className={`flex flex-col gap-2 h-full ${className}`}>
    {children}
  </div>
);

const DashboardManager = () => {
  return (
    <div className="min-h-screen w-full bg-slate-50 p-2 lg:p-3">
      <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 items-stretch">

        <DashboardColumn>
          <SalesPipelineBox />
          <ShopPipelineBox className="h-full" />
        </DashboardColumn>

        <DashboardColumn>
          <div className="max-h-[25rem] xl:max-h-[113vh] md:h-full">
            <TaskListBox />
          </div>
          <div className="lg:hidden xl:hidden flex-grow">
            <ReputationBox />
          </div>
          <div className="hidden lg:block xl:hidden">
            <AppointmentListBox />
          </div>
        </DashboardColumn>

        <DashboardColumn>
          <div className="hidden h-full xl:block">
            <AppointmentListBox />
          </div>

          <div className="flex flex-col gap-2 xl:hidden h-full">
            <RevenueBox />
            <InventoryBox className="h-full" />
          </div>

          <div className="lg:hidden">
            <EmployeePayoutBox className="h-full" />
          </div>
        </DashboardColumn>

        <DashboardColumn className="lg:col-span-1 xl:col-span-2">
          <div className="hidden xl:grid grid-cols-2 gap-2 h-full">
            <RevenueBox />
            <InventoryBox />
          </div>

          <EmployeePayoutBox className="h-full hidden lg:block" />
          <div className="lg:hidden h-full">
            <AppointmentListBox />
          </div>

          <div className="hidden lg:block h-full">
            <ReputationBox />
          </div>
        </DashboardColumn>
      </div>
    </div>
  );
};

export default DashboardManager;
