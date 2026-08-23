import { deleteHoliday } from "@/actions/task/deleteHoliday";
import { Dialog, DialogContent, DialogFooter } from "@/components/Dialog";
import { useCalendarStore } from "@/stores/calendarStore";
import { Holiday } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import moment from "moment";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { calenderQueryKey } from "../../_constant";

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
        const removedHoliday = response.data?.date
          ? moment.utc(response.data.date).format("MMMM DD, YYYY")
          : "Holiday";
        toast.success(`${removedHoliday} removed successfully!`);
        setOpen(false);
      } else {
        throw new Error(response?.error || "Failed to remove holiday");
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
      <DialogContent className="max-w-sm rounded-xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="size-6 text-red-500" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            Remove holiday?
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            This holiday will be permanently removed from the calendar. This
            action can&apos;t be undone.
          </p>
        </div>
        <DialogFooter className="mt-5 flex-nowrap justify-stretch gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => setOpen(false)}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(handleRemoveHoliday)}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {pending ? "Removing..." : "Remove"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
