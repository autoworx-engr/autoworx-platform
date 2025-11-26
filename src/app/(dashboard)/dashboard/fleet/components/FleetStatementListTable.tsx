"use client";
import React, { useState } from "react";
import { cn } from "@/lib/cn";
import { FleetStatementModal } from "./FleetStatementModal";
import moment from "moment";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";

interface FleetStatementListTableProps {
  statementData: any[];
  loading?: boolean;
  onRefresh?: () => void;
}

const FleetStatementListTable: React.FC<FleetStatementListTableProps> = ({
  statementData,
  loading = false,
  onRefresh,
}) => {
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(
    null
  );

  const tHeadingCommonClasses =
    "px-4 py-2 text-center font-bold text-[#66738C]";
  const tDataCommonClasses = "px-4 py-2 text-[#66738C] text-center";

  const handleViewStatement = (statementId: string) => {
    setSelectedStatementId(statementId);
  };

  const handleCloseModal = () => {
    setSelectedStatementId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading statements...</div>
      </div>
    );
  }

  if (!statementData || statementData.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">No fleet statements found</div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-md bg-background p-4 shadow-md">
      <div className="overflow-x-auto hidden md:block">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="bg-background">
              <th className={`${tHeadingCommonClasses}`}>Statement#</th>
              <th className={`${tHeadingCommonClasses}`}>Date Created</th>
              {/* <th className={`${tHeadingCommonClasses}`}>Fleet Name</th> */}
              <th className={`${tHeadingCommonClasses}`}>
                Number of Invoices in Statement
              </th>
              <th className={`${tHeadingCommonClasses}`}>Total Amount</th>
              <th className={`${tHeadingCommonClasses}`}>Paid Amount</th>
              <th className={`${tHeadingCommonClasses}`}>Due Amount</th>
              <th className={`${tHeadingCommonClasses}`}>Status</th>
            </tr>
          </thead>
          <tbody>
            {statementData.map((statement, index) => (
              <tr
                key={statement.id}
                className={cn(
                  "cursor-pointer rounded-md border py-3 hover:bg-gray-50",
                  index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]"
                )}
                onClick={() => handleViewStatement(statement.id)}
              >
                <td className={`${tDataCommonClasses}`}>
                  <span className="font-medium text-blue-600">
                    {statement.id.slice(-8)}
                  </span>
                </td>
                <td className={`${tDataCommonClasses}`}>
                  {moment(statement.createdAt).format("DD MMMM YYYY hh:mmA")}
                </td>
                {/* <td className={`${tDataCommonClasses}`}>
                  {statement.Fleet?.fleetName || "N/A"}
                </td> */}
                <td className={`${tDataCommonClasses}`}>
                  {statement.invoice?.length || 0}
                </td>
                <td className={`${tDataCommonClasses}`}>
                  {formatCurrency(
                    statement.totals?.totalAmount?.toFixed(2) || "0.00"
                  )}
                </td>
                <td className={`${tDataCommonClasses}`}>
                  {formatCurrency(
                    statement.totals?.totalPaid?.toFixed(2) || "0.00"
                  )}
                </td>
                <td className={`${tDataCommonClasses}`}>
                  <span
                    className={
                      statement.totals?.totalDue > 0
                        ? "font-medium text-red-600"
                        : "text-green-600"
                    }
                  >
                    {formatCurrency(
                      statement.totals?.totalDue?.toFixed(2) || "0.00"
                    )}
                  </span>
                </td>
                <td className={`${tDataCommonClasses} `}>
                  <span className={`px-2 py-1 rounded text-xs font-medium text-white ${statement.totals?.totalDue > 0
                    ? "bg-[#dc4757]/90"
                    : "bg-[#27837c]/90"
                    }`}>

                    {statement.totals?.totalDue > 0 ? "Pending" : "Paid"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="block md:hidden">
        <div className="space-y-3">
          {statementData.map((statement, index) => (
            <Card
              key={statement.id}
              className={cn(
                "cursor-pointer border hover:shadow-md transition-shadow",
                index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]"
              )}
              onClick={() => handleViewStatement(statement.id)}
            >
              <CardContent className="p-4">
                {/* Header with Statement ID and Status */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-blue-600 text-lg">
                    #{statement.id.slice(-8)}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${statement.totals?.totalDue > 0
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                      }`}
                  >
                    {statement.totals?.totalDue > 0 ? "Pending" : "Paid"}
                  </span>
                </div>

                {/* Date and Invoice Count */}
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Date Created:</span>
                    <span className="text-sm font-medium">
                      {moment(statement.createdAt).format("DD MMM YYYY")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Invoices:</span>
                    <span className="text-sm font-medium">
                      {statement.invoice?.length || 0} invoices
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {/* Fleet Statement Modal */}
      <FleetStatementModal
        isOpen={!!selectedStatementId}
        onClose={handleCloseModal}
        statementId={selectedStatementId || undefined}
        onPaymentSuccess={() => {
          // Refresh the statements list using the provided callback
          if (onRefresh) {
            onRefresh();
          }
        }}
      />
    </div>
  );
};

export default FleetStatementListTable;
