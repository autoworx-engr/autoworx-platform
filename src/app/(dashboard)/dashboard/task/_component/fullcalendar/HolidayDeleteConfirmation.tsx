import { deleteHoliday } from "@/actions/task/deleteHoliday";
import { Dialog, DialogContent, DialogFooter } from "@/components/Dialog";
import { useQueryClient } from "@tanstack/react-query";
import moment from "moment";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { calenderQueryKey } from "../../_constant";
import { Holiday } from "@prisma/client";
import { useCalendarStore } from "@/stores/calendarStore";
import { Trash2 } from "lucide-react";

type TProps = {
  holidayId: number;
  isMonthly?: boolean;
};
export default function HolidayDeleteConfirmation({
  holidayId,
  isMonthly,
}: TProps) {
  const queryClient = useQueryClient();
  const { selectedMonth, selectedYear } = useCalendarStore((state) => ({
    selectedMonth: state.holidaySelectedMonth,
    selectedYear: state.holidaySelectedYear,
  }));
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const handleRemoveHoliday = async () => {
    try {
      const response = await deleteHoliday(holidayId);
      if (response?.status === 200) {
        const removedHoliday = moment(response.data.date).format(
          "MMMM DD, YYYY",
        );
        console.log("removedHoliday", removedHoliday);
        queryClient.setQueryData(
          [calenderQueryKey.holidays],
          (oldData: Holiday[]) => {
            return oldData
              ? oldData.filter((holiday) => holiday.id !== holidayId)
              : [];
          },
        );
        queryClient.invalidateQueries({
          queryKey: [calenderQueryKey.holidays, selectedMonth, selectedYear],
        });
        toast.success(`${removedHoliday} - Holiday removed successfully!`);
        setOpen(false);
      } else {
        throw new Error("Failed to remove holiday");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  return (
    <Dialog open={open} onOpenChange={() => setOpen((prev) => !prev)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-full ${!isMonthly && "bg-red-200"} p-1`}
      >
        <Trash2
          className={`cursor-pointer size-3 sm:size-4 ${!isMonthly ? "text-red-500" : "text-orange-500"} `}
        />
      </button>
      <DialogContent>
        <h2 className="mt-5 text-center text-xl font-semibold">
          Are you sure you want to remove this holiday?
        </h2>
        <DialogFooter className="py-4">
          <button
            disabled={pending}
            onClick={() => startTransition(handleRemoveHoliday)}
            className="mx-auto rounded bg-[#6571FF] px-8 py-2 text-white"
          >
            Confirm Remove
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
