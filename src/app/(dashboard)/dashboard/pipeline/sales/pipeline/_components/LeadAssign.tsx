import { Tooltip } from "antd";
import React, { useEffect, useRef, useState } from "react";
import SalesSelector from "../../../components/SalesSelector";
import { IoIosAddCircleOutline } from "react-icons/io";
import { User } from "@prisma/client";
import { LeadWithSalesUser } from "@/types/invoiceLead";
import { updateLeadSalesUser } from "@/actions/pipelines/updateLeadSalesUser";
import {
  useColumnDispatch,
  useCompanyUsers,
} from "@/context/sales-pipeline.context";
import { actionTypes } from "@/constants/lead.constant";
import { errorToast, successToast } from "@/lib/toast";
import useCompanyUsersQuery from "@/hooks/query-hook/useCompanyUsersQuery";

type TSalesUserSelect = {
  leadId: number;
  columnId: number;
  user: Partial<User>;
};

type TProps = {
  lead: LeadWithSalesUser;
  salesUser: {
    id: number;
    firstName: string;
    lastName: string | null;
  } | null;
};

export default function LeadAssign({ lead, salesUser }: TProps) {
  const [isSalesSelectorOpen, setIsSalesSelectorOpen] = useState(false);
  const { data: companyUsers = [] } = useCompanyUsersQuery();
  const dispatch = useColumnDispatch();

  const handleSalesUserSelect = async ({
    leadId,
    columnId,
    user,
  }: TSalesUserSelect) => {
    try {
      dispatch({
        type: actionTypes.ADD_SALES_USER,
        payload: {
          columnId,
          leadId,
          user,
        },
      });
      setIsSalesSelectorOpen(false);
      await updateLeadSalesUser(leadId, user?.id!);
      successToast("Sales user assigned successfully");
    } catch (err) {
      console.error("selected sales user error", err);
      dispatch({
        type: actionTypes.REMOVE_SALES_USER,
        payload: {
          columnId: lead.columnId,
          leadId: lead.id,
        },
      });

      errorToast("Failed to assign sales user. Please try again.");
    }
  };

  //the sales selector
  const salesSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        salesSelectorRef.current &&
        !salesSelectorRef.current.contains(event.target as Node)
      ) {
        setIsSalesSelectorOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      {salesUser ? (
        <Tooltip title={`Assign To Me`} placement="right">
          <div
            className="flex items-center justify-center size-6 rounded-full border-2 border-[#66738C] p-1 text-[.60rem] text-[#66738C]"
            onClick={() => setIsSalesSelectorOpen((prev) => !prev)}
          >
            {salesUser.firstName.charAt(0).toUpperCase() +
              salesUser.lastName?.charAt(0).toUpperCase()}
          </div>
        </Tooltip>
      ) : (
        <IoIosAddCircleOutline
          className="mt-1 cursor-pointer text-2xl"
          fontSize="medium"
          onClick={() => setIsSalesSelectorOpen((prev) => !prev)}
        />
      )}
      {isSalesSelectorOpen && (
        <div ref={salesSelectorRef} className="absolute right-0 top-6 z-10">
          <SalesSelector
            users={companyUsers ?? []}
            onSelect={(user) => {
              if (user && lead.columnId) {
                handleSalesUserSelect({
                  leadId: lead.id,
                  columnId: lead.columnId,
                  user: user,
                });
              }
            }}
          />
        </div>
      )}
    </>
  );
}
