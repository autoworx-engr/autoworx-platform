"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/Dialog";
import { SlimInput } from "@/components/SlimInput";
import {
  useGetAllYears,
  useGetMake,
  useGetModelsByYearAndMake,
} from "@/hooks/useCarData";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { RotatingLines } from "react-loader-spinner";
import Selector from "../../settings/automation/components/Selector";
import InvoiceEstimateAttachment from "./InvoiceEstimateAttachment";
import { sendRequestEstimate } from "./requestEstimateSubmit";

type TProps = {
  receiverCompany: {
    id: number;
    name: string;
  };
  currentCompanyId: number;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setShowAttachment: React.Dispatch<React.SetStateAction<boolean>>;
};

const emptyEstimate = {
  model: "",
  year: "",
  make: "",
  serviceRequest: "",
  dueDate: "",
  notes: "",
};

export default function InvoiceEstimateModal({
  receiverCompany,
  currentCompanyId,
  setMessages,
  setShowAttachment,
}: TProps) {
  const [pending, startTransition] = useTransition();
  const { data: authUser } = useSession();
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [estimateInfo, setEstimateInfo] = useState(emptyEstimate);

  const { data: years }: any = useGetAllYears();
  const { data: makes }: any = useGetMake();
  const { data: models }: any = useGetModelsByYearAndMake(
    estimateInfo.year,
    estimateInfo.make,
  );

  const makeOptions = makes?.data?.map((vehicle: any) => ({
    title: vehicle.name ?? "Unknown",
    id: vehicle.name,
  }));
  const modelOptions = models?.data?.map((vehicle: any) => ({
    title: vehicle.name ?? "Unknown",
    id: vehicle.name,
  }));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { value, name } = e.target;
    setEstimateInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleEstimateSubmit = async () => {
    try {
      setError("");

      const user = (authUser as Session & { user: { companyId: number } })
        ?.user;

      await sendRequestEstimate({
        photos,
        estimateInfo,
        receiverCompanyId: receiverCompany.id,
        senderCompanyId: user?.companyId,
        senderUserId: Number(user?.id),
      });

      setOpen(false);
      setEstimateInfo(emptyEstimate);
      setPhotos([]);
      setShowAttachment(false);
      toast.success("Estimate requested successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to request estimate";
      toast.error("Failed to request estimate");
      setError(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <p className="cursor-pointer rounded-md border border-[#006D77] bg-background px-2 text-sm text-[#006D77] hover:bg-[#006D77] hover:text-white">
          Request Estimate
        </p>
      </DialogTrigger>

      <DialogContent
        form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(handleEstimateSubmit);
        }}
        className="flex max-h-full w-[96%] flex-col"
      >
        {/* Header */}
        <div className="shrink-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-600 dark:text-slate-100">
            Request an Estimate
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Send {receiverCompany.name} the vehicle and service details
          </p>
        </div>

        {/* Scrollable body */}
        <div className="thin-scrollbar scrollbar-thumb-slate-200 scrollbar-track-transparent dark:scrollbar-thumb-slate-700 flex-1 space-y-2 overflow-y-auto py-1">
          {error && <p className="text-center text-sm text-red-400">{error}</p>}

          {/* Vehicle Information Section */}
          <div className="border-t border-slate-200 pb-1 pt-3 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-600 dark:text-slate-300">
              Vehicle Information <span className="text-[#E9405F]">*</span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Select the year, make &amp; model of the vehicle
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 p-1">
            <Selector
              name="year"
              label="Year"
              placeholder="Select year"
              options={years?.data}
              value={estimateInfo.year}
              onChange={(value) =>
                setEstimateInfo((prev) => ({ ...prev, year: value, model: "" }))
              }
              isSearch
              isClear
              required
            />
            <Selector
              name="make"
              label="Make"
              placeholder="Select make"
              options={makeOptions || []}
              value={estimateInfo.make}
              onChange={(value) =>
                setEstimateInfo((prev) => ({ ...prev, make: value, model: "" }))
              }
              isSearch
              isClear
              required
            />
            <Selector
              name="model"
              label="Model"
              placeholder="Select model"
              options={modelOptions || []}
              value={estimateInfo.model}
              onChange={(value) =>
                setEstimateInfo((prev) => ({ ...prev, model: value }))
              }
              isSearch
              isClear
              required
            />
          </div>

          {/* Service Details Section */}
          <div className="border-t border-slate-200 pb-1 pt-3 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-600 dark:text-slate-300">
              Service Details
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 p-1">
            <SlimInput
              label="Service Requested"
              name="serviceRequest"
              type="text"
              placeholder="e.g. Brake inspection"
              value={estimateInfo.serviceRequest}
              onChange={handleChange}
              labelClassName="text-base"
              className="h-9 rounded-lg border-slate-200 text-sm shadow-sm"
            />
            <SlimInput
              label="Due Date"
              name="dueDate"
              type="date"
              placeholder="Select date"
              value={estimateInfo.dueDate}
              onChange={handleChange}
              labelClassName="text-base"
              className="h-9 rounded-lg border-slate-200 text-sm shadow-sm"
            />
          </div>

          <label className="block">
            <div className="mb-1 font-medium text-slate-600 dark:text-slate-300">
              Notes
            </div>
            <textarea
              name="notes"
              value={estimateInfo.notes}
              onChange={handleChange}
              placeholder="Add any extra details…"
              className="h-[93px] w-full resize-none rounded-lg border border-slate-200 bg-white/80 px-3 py-1.5 text-sm leading-6 text-slate-600 shadow-sm outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-primary/60 focus:ring-2 focus:ring-primary/40 dark:bg-slate-900/50 dark:text-slate-300"
            />
          </label>

          <InvoiceEstimateAttachment photos={photos} setPhotos={setPhotos} />
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 pt-2">
          <DialogClose className="rounded-lg border p-2">Cancel</DialogClose>
          <button
            disabled={pending}
            type="submit"
            className="rounded-lg bg-gradient-to-r from-primary to-[#5a66ee] px-5 py-2 font-medium text-white transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? (
              <RotatingLines strokeColor="#fff" width="25" />
            ) : (
              "Request Estimate"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
