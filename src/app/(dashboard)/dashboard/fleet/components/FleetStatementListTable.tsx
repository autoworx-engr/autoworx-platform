"use client";
import { deleteFleetStatement } from "@/actions/fleet/statement/deleteStatement";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { errorToast, successToast } from "@/lib/toast";
import { formatCurrency } from "@/utils/formatCurrency";
import { Popconfirm } from "antd";
import { PencilLineIcon, Trash2 } from "lucide-react";
import moment from "moment";
import React, { useEffect, useState } from "react";
import EditFleetStatementModal from "./EditFleetStatementModal"; // Add this import
import { FleetStatementModal } from "./FleetStatementModal";

interface FleetStatementListTableProps {
  statementData: any[];
  loading?: boolean;
  onRefresh?: () => void;
}

const FleetStatementListTable: React.FC<FleetStatementListTableProps> = ({
  statementData: initialStatementData,
  loading = false,
  onRefresh,
}) => {
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(
    null,
  );

  // Add state for edit modal
  const [editStatementId, setEditStatementId] = useState<string | null>(null);

  // Local state to manage statements for immediate UI updates
  const [localStatements, setLocalStatements] = useState(initialStatementData);

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Update local state when prop changes
  useEffect(() => {
    setLocalStatements(initialStatementData);
  }, [initialStatementData]);

  const tHeadingCommonClasses =
    "px-4 py-2 text-center font-bold text-[#66738C]";
  const tDataCommonClasses = "px-4 py-2 text-[#66738C] text-center";

  const handleViewStatement = (statementId: string) => {
    setSelectedStatementId(statementId);
  };

  const handleCloseModal = () => {
    setSelectedStatementId(null);
  };

  // Add handlers for edit modal
  const handleEditStatement = (statementId: string) => {
    setEditStatementId(statementId);
  };

  const handleCloseEditModal = () => {
    setEditStatementId(null);
  };

  // Handle delete statement. The row stays in the list (marked as
  // "deleting") until the server confirms success — only then is it
  // actually removed, so the empty state can't show prematurely.
  const handleDeleteStatement = async (statementId: string) => {
    setDeletingIds((prev) => new Set(prev).add(statementId));

    try {
      const result = await deleteFleetStatement({ statementId });

      if (result.type === "success") {
        setLocalStatements((prev) => prev.filter((s) => s.id !== statementId));
        successToast(result.message || "Statement deleted successfully");

        // Trigger parent refresh to sync data from server
        if (onRefresh) {
          onRefresh();
        }
      } else {
        errorToast(result.message || "Failed to delete statement");
      }
    } catch (error: any) {
      errorToast(error.message || "An error occurred while deleting");
      console.error("Delete statement error:", error);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(statementId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center py-8">
        <div className="text-gray-500">Loading statements...</div>
      </div>
    );
  }

  if (!localStatements || localStatements.length === 0) {
    return (
      <div className="flex min-h-[500px] items-center justify-center py-8">
        <div className="text-gray-500">No fleet statements found</div>
      </div>
    );
  }

  // Get current statement being edited
  const currentEditStatement = localStatements.find(
    (s) => s.id === editStatementId,
  );

  return (
    <div className="mt-5 min-h-[500px] rounded-md bg-background p-4 shadow-md">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="bg-background">
              <th className={`${tHeadingCommonClasses}`}>Statement#</th>
              <th className={`${tHeadingCommonClasses}`}>Date Created</th>
              <th className={`${tHeadingCommonClasses}`}>
                Number of Invoices in Statement
              </th>
              <th className={`${tHeadingCommonClasses}`}>Total Amount</th>
              <th className={`${tHeadingCommonClasses}`}>Paid Amount</th>
              <th className={`${tHeadingCommonClasses}`}>Due Amount</th>
              <th className={`${tHeadingCommonClasses}`}>Status</th>
              <th className={`${tHeadingCommonClasses}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {localStatements.map((statement, index) => {
              const isDeleting = deletingIds.has(statement.id);
              return (
                <tr
                  key={statement.id}
                  className={cn(
                    "cursor-pointer rounded-md border py-3 hover:bg-gray-50 transition-colors",
                    index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]",
                  )}
                  onClick={() => handleViewStatement(statement.id)}
                >
                  <td className={`${tDataCommonClasses}`}>
                    <span className="font-medium text-blue-600">
                      {statement.id.slice(-8)}
                    </span>
                  </td>
                  <td className={`${tDataCommonClasses}`}>
                    {moment(statement.createdAt).format("MMMM DD, YYYY hh:mmA")}
                  </td>
                  <td className={`${tDataCommonClasses}`}>
                    {statement.invoice?.length || 0}
                  </td>
                  <td className={`${tDataCommonClasses}`}>
                    {formatCurrency(
                      statement.totals?.totalAmount?.toFixed(2) || "0.00",
                    )}
                  </td>
                  <td className={`${tDataCommonClasses}`}>
                    {formatCurrency(
                      statement.totals?.totalPaid?.toFixed(2) || "0.00",
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
                        statement.totals?.totalDue?.toFixed(2) || "0.00",
                      )}
                    </span>
                  </td>
                  <td className={`${tDataCommonClasses} `}>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium text-white ${
                        statement.totals?.totalDue > 0
                          ? "bg-[#dc4757]/90"
                          : "bg-[#27837c]/90"
                      }`}
                    >
                      {statement.totals?.totalDue > 0 ? "Pending" : "Paid"}
                    </span>
                  </td>
                  <td className={`${tDataCommonClasses}`}>
                    <div className="flex items-center justify-center gap-4">
                      <Popconfirm
                        title="Delete this statement?"
                        description="Are you sure you want to delete this statement?"
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          handleDeleteStatement(statement.id);
                        }}
                        onCancel={(e) => e?.stopPropagation()}
                        placement="topLeft"
                        okText="Yes"
                        cancelText="No"
                      >
                        <button
                          onClick={(e) => e.stopPropagation()}
                          disabled={isDeleting}
                          className="text-red-600 hover:text-red-800 transition-colors disabled:cursor-not-allowed"
                        >
                          <Trash2 size={20} />
                        </button>
                      </Popconfirm>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditStatement(statement.id); // Updated handler
                        }}
                        disabled={isDeleting}
                        className="text-blue-600 hover:text-blue-800 transition-colors disabled:cursor-not-allowed"
                      >
                        <PencilLineIcon size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="block md:hidden">
        <div className="space-y-3">
          {localStatements.map((statement, index) => {
            const isDeleting = deletingIds.has(statement.id);
            return (
              <Card
                key={statement.id}
                className={cn(
                  "cursor-pointer border hover:shadow-md transition-shadow",
                  index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]",
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
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        statement.totals?.totalDue > 0
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {statement.totals?.totalDue > 0 ? "Pending" : "Paid"}
                    </span>
                  </div>

                  {/* Date, Invoice Count, and Amounts */}
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Date Created:
                      </span>
                      <span className="text-sm font-medium">
                        {moment(statement.createdAt).format("MMM DD, YYYY")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Invoices:</span>
                      <span className="text-sm font-medium">
                        {statement.invoice?.length || 0} invoices
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Total Amount:
                      </span>
                      <span className="text-sm font-medium">
                        {formatCurrency(
                          statement.totals?.totalAmount?.toFixed(2) || "0.00",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Paid Amount:
                      </span>
                      <span className="text-sm font-medium">
                        {formatCurrency(
                          statement.totals?.totalPaid?.toFixed(2) || "0.00",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Due Amount:</span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          statement.totals?.totalDue > 0
                            ? "text-red-600"
                            : "text-green-600",
                        )}
                      >
                        {formatCurrency(
                          statement.totals?.totalDue?.toFixed(2) || "0.00",
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons for Mobile */}
                  <div className="flex items-center justify-end gap-3 pt-2 border-t">
                    <Popconfirm
                      title="Delete this statement?"
                      description="Are you sure you want to delete this statement?"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDeleteStatement(statement.id);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      placement="topLeft"
                      okText="Yes"
                      cancelText="No"
                    >
                      <button
                        onClick={(e) => e.stopPropagation()}
                        disabled={isDeleting}
                        className="text-red-600 hover:text-red-800 transition-colors disabled:cursor-not-allowed"
                      >
                        <Trash2 size={18} />
                      </button>
                    </Popconfirm>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStatement(statement.id); // Updated handler
                      }}
                      disabled={isDeleting}
                      className="text-blue-600 hover:text-blue-800 transition-colors disabled:cursor-not-allowed"
                    >
                      <PencilLineIcon size={18} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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

      {/* Edit Fleet Statement Modal */}
      {editStatementId && currentEditStatement && (
        <EditFleetStatementModal
          isOpen={!!editStatementId}
          onClose={handleCloseEditModal}
          statementId={editStatementId}
          currentInvoices={currentEditStatement.invoice || []}
          onStatementUpdated={() => {
            handleCloseEditModal();
            if (onRefresh) {
              onRefresh();
            }
          }}
        />
      )}
    </div>
  );
};

export default FleetStatementListTable;
