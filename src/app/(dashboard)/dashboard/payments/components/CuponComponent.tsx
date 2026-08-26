"use client";
import { deleteCoupon } from "@/actions/coupon/new";
import { Coupon } from "@prisma/client";
import { Pagination, Popconfirm } from "antd"; // Importing the Pagination component from Ant Design
import { PencilLineIcon, X } from "lucide-react";
import moment from "moment";
import React, { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import EditCoupon from "./EditCoupon";
import NewCoupon from "./NewCoupon";
import QrCodeForCoupon from "./QrCodeForCoupon";

// Define the props for the CouponTable component
interface CouponTableProps {
  coupons: Coupon[];
  setCoupons: React.Dispatch<React.SetStateAction<Coupon[] | null>>;
}

// CuponComponet component
const CuponComponet = ({ coupons, setCoupons }: CouponTableProps) => {
  const isDesktop = useMediaQuery({ query: "(min-width: 640px)" });
  const [showQr, setShowQr] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showPagination, setShowPagination] = useState(false);

  useEffect(() => {
    if (coupons.length > 10) {
      setShowPagination(true);
    } else {
      setShowPagination(false);
    }
  }, [coupons]);

  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  const paginatedCoupons = coupons.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleCouponQr = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setShowQr(true);
  };

  const handleEdit = (e: React.MouseEvent, coupon: Coupon) => {
    e.stopPropagation();
    setSelectedCoupon(coupon);
    setIsEditOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, coupon: Coupon) => {
    e.stopPropagation();
    await deleteCoupon(coupon.id);
    setCoupons(
      (prevCoupons) => prevCoupons?.filter((c) => c.id !== coupon.id) || null,
    );
    setSelectedCoupon(null);
    setShowQr(false);
  };

  const handleUpdate = (updatedCoupon: Coupon) => {
    setCoupons(
      (prevCoupons) =>
        prevCoupons?.map((coupon) =>
          coupon.id === updatedCoupon.id ? updatedCoupon : coupon,
        ) || null,
    );
  };

  return (
    <div className={`w-full ${isDesktop ? "flex gap-4" : "block"}`}>
      {/* first half */}
      <div
        className={`flex flex-col rounded-lg border bg-background p-4 shadow-lg ${isDesktop ? "h-[65vh] w-[75vw]" : "w-full"}`}
      >
        {/* Button Bar */}
        <div className="mb-3 flex justify-end">
          <div>
            <NewCoupon setCoupons={setCoupons} />
          </div>
        </div>

        {/* Desktop View */}
        {isDesktop ? (
          <div className="overflow-y-scroll rounded-md bg-background">
            <table className="min-w-full border-collapse border border-gray-200 bg-background">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 px-4 py-2 text-left text-gray-600">
                    Coupon Name
                  </th>
                  <th className="border-b border-gray-200 px-4 py-2 text-left text-gray-600">
                    Coupon Code
                  </th>
                  <th className="border-b border-gray-200 px-4 py-2 text-left text-gray-600">
                    Discount
                  </th>
                  <th className="border-b border-gray-200 px-4 py-2 text-left text-gray-600">
                    Start Date
                  </th>
                  <th className="border-b border-gray-200 px-4 py-2 text-left text-gray-600">
                    Status
                  </th>
                  <th className="border-b border-gray-200 px-4 py-2 text-left text-gray-600">
                    Redemption Count
                  </th>
                  <th className="border-b border-gray-200 px-4 py-2 text-left text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedCoupons.map((coupon, index) => (
                  <tr
                    key={index}
                    onClick={() => handleCouponQr(coupon)}
                    className={`${index % 2 === 0 ? "bg-background" : "bg-[#EEF4FF]"}`}
                    style={{
                      cursor: "pointer",
                      border:
                        selectedCoupon?.id === coupon.id
                          ? "2px solid #6571FF"
                          : "",
                    }}
                  >
                    <td className="border-b border-gray-200 px-4 py-2">
                      {coupon.name}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-2">
                      {coupon.code}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-2">
                      {Number(coupon.discount).toFixed(2)}
                      {coupon.discountType === "Fixed" ? "$" : "%"}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-2">
                      {moment.utc(coupon.startDate).format("MM/DD/YYYY")}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-2">
                      {coupon.status}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-2">
                      {coupon.redemptions}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-2">
                      <div className="flex gap-3">
                        <button
                          className="text-left text-2xl text-blue-600"
                          onClick={(e) => handleEdit(e, coupon)}
                        >
                          <PencilLineIcon className="w-5 h-5 text-primary" />
                        </button>
                        <Popconfirm
                          title="Delete the Coupon"
                          description="Are you sure to delete this Coupon?"
                          okText="Yes"
                          cancelText="No"
                          onConfirm={(e) =>
                            e
                              ? handleDelete(e, coupon)
                              : handleDelete({} as React.MouseEvent, coupon)
                          }
                          overlayClassName="[&_.ant-popover-inner]:rounded-2xl [&_.ant-popover-inner]:p-4 [&_.ant-popover-message-title]:font-semibold [&_.ant-popover-message-title]:text-slate-800"
                          okButtonProps={{
                            className:
                              "!rounded-lg !border-none !bg-[#6571ff] !font-semibold !shadow-sm !shadow-[#6571ff]/30 hover:!bg-[#525ceb]",
                          }}
                          cancelButtonProps={{
                            className:
                              "!rounded-lg !border-slate-200 !font-medium !text-slate-600 hover:!border-slate-300 hover:!bg-slate-50 hover:!text-slate-700",
                          }}
                        >
                          <X
                            size={20}
                            strokeWidth={3}
                            cursor={"pointer"}
                            color="#f87171"
                          />
                        </Popconfirm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Mobile View */
          <div className="mx-4 grid gap-4">
            {paginatedCoupons.map((coupon, index) => (
              <div key={index} className="space-y-4">
                <div
                  className={`w-full rounded-lg border p-4 transition-all duration-200 ${index % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]"} ${selectedCoupon?.id === coupon.id ? "border-2 border-primary" : ""}`}
                  onClick={() => handleCouponQr(coupon)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">{coupon.name}</h3>
                    <div className="flex gap-3">
                      <button
                        className="text-left text-2xl text-blue-600"
                        onClick={(e) => handleEdit(e, coupon)}
                      >
                        <PencilLineIcon className="w-5 h-5 text-primary" />
                      </button>
                      <Popconfirm
                        title="Delete the Coupon"
                        description="Are you sure to delete this Coupon?"
                        okText="Yes"
                        cancelText="No"
                        onConfirm={(e) =>
                          e
                            ? handleDelete(e, coupon)
                            : handleDelete({} as React.MouseEvent, coupon)
                        }
                        overlayClassName="[&_.ant-popover-inner]:rounded-2xl [&_.ant-popover-inner]:p-4 [&_.ant-popover-message-title]:font-semibold [&_.ant-popover-message-title]:text-slate-800"
                        okButtonProps={{
                          className:
                            "!rounded-lg !border-none !bg-[#6571ff] !font-semibold !shadow-sm !shadow-[#6571ff]/30 hover:!bg-[#525ceb]",
                        }}
                        cancelButtonProps={{
                          className:
                            "!rounded-lg !border-slate-200 !font-medium !text-slate-600 hover:!border-slate-300 hover:!bg-slate-50 hover:!text-slate-700",
                        }}
                      >
                        <X
                          size={20}
                          strokeWidth={3}
                          cursor={"pointer"}
                          color="#f87171"
                        />
                      </Popconfirm>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Coupon Code</p>
                      <p>{coupon.code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Discount</p>
                      <p>
                        {Number(coupon.discount).toFixed(2)}
                        {coupon.discountType === "Fixed" ? "$" : "%"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Start Date</p>
                      <p>{moment.utc(coupon.startDate).format("MM/DD/YYYY")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p>{coupon.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Redemption Count</p>
                      <p>{coupon.redemptions}</p>
                    </div>
                  </div>
                </div>
                {/* Mobile Coupon Details */}
                {showQr && selectedCoupon?.id === coupon.id && (
                  <div className="rounded-lg border bg-background p-4 shadow-lg">
                    <div className="mb-4 w-full text-xl font-bold">
                      Coupon Details
                    </div>
                    <div className="flex flex-grow items-center justify-center">
                      <QrCodeForCoupon
                        showQr={showQr}
                        coupon={selectedCoupon}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showPagination && (
          <div className="mt-4 flex justify-end">
            <Pagination
              className="custom-pagination"
              current={currentPage}
              pageSize={pageSize}
              total={coupons.length}
              onChange={handlePageChange}
              showSizeChanger
              onShowSizeChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Desktop Coupon Details */}
      {isDesktop && (
        <div className="flex w-[20vw] flex-col rounded-lg border bg-background p-4 shadow-lg">
          <div className="mb-4 w-full text-xl font-bold">Coupon Details</div>
          <div className="flex flex-grow items-center justify-center">
            {showQr && selectedCoupon ? (
              <QrCodeForCoupon showQr={showQr} coupon={selectedCoupon} />
            ) : (
              "Select a coupon to view details"
            )}
          </div>
        </div>
      )}
      {isEditOpen && selectedCoupon && (
        <EditCoupon
          coupon={selectedCoupon}
          onUpdate={handleUpdate}
          onClose={() => setIsEditOpen(false)}
        />
      )}
    </div>
  );
};

export default CuponComponet;
