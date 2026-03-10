"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/Dialog";
import { SlimInput } from "@/components/SlimInput";
import { useState, useTransition } from "react";
import InvoiceEstimateAttachment from "./InvoiceEstimateAttachment";
import { requestEstimate } from "@/actions/communication/collaboration/requestEstimate";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import toast from "react-hot-toast";
import { RotatingLines } from "react-loader-spinner";
import imageCompression from "browser-image-compression";

type TProps = {
  receiverCompany: {
    id: number;
    name: string;
  };
  currentCompanyId: number;
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setShowAttachment: React.Dispatch<React.SetStateAction<boolean>>;
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

  const [estimateInfo, setEstimateInfo] = useState({
    model: "",
    year: "",
    make: "",
    serviceRequest: "",
    dueDate: "",
    notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { value, name } = e.target;
    setEstimateInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleEstimateSubmit = async () => {
    console.log("request estimate");
    try {
      setError("");

      const formDataForPhoto = new FormData();

      if (photos.length > 0) {
        const compressedPhotos = await Promise.all(
          photos.map((photo) =>
            imageCompression(photo, {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            }),
          ),
        );

        compressedPhotos.forEach((file) => {
          formDataForPhoto.append("file", file);
        });
      }

      const senderCompanyId = (
        authUser as Session & { user: { companyId: number } }
      )?.user?.companyId;
      const senderUserId = (
        authUser as Session & { user: { companyId: number } }
      )?.user?.id;

      const { status, data } = await requestEstimate(formDataForPhoto, {
        ...estimateInfo,
        year: parseInt(estimateInfo.year),
        receiverCompanyId: receiverCompany.id,
        senderCompanyId,
      });

      if (status !== 200) {
        throw new Error("Failed to request estimate");
      }

      const { requestEstimateFromDB } = data;

      setOpen(false);
      setEstimateInfo({
        model: "",
        year: "",
        make: "",
        serviceRequest: "",
        dueDate: "",
        notes: "",
      });

      /* ---------------- REALTIME SEND ---------------- */

      const pusherResponse = await fetch("/api/pusher/collaboration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromCompanyId: senderCompanyId,
          senderUserId: senderUserId,
          message: null,
          attachmentFiles: null,
          section: "collaboration",
          toCompanyId: receiverCompany.id,
          attachmentFile: null,
          requestEstimateId: requestEstimateFromDB?.id,
        }),
      });

      const messageData = await pusherResponse.json();

      if (!pusherResponse.ok || !messageData.success) {
        throw new Error("Message wasn't sent");
      }

      /* ---------------- LOCAL STATE UPDATE ---------------- */

      // const newMessage: any = {
      //   message: "",
      //   sender: "COMPANY",
      //   attachment: null,
      //   requestEstimate: requestEstimateFromDB,
      //   createdAt: new Date(),
      // };

      // setMessages((prev) => [...prev, newMessage]);
      setPhotos([]);
      setShowAttachment(false);
      toast.success("Estimate requested successfully");
    } catch (err: any) {
      toast.error("Failed to request estimate");
      setError(err.message);
      console.error(err);
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
        className="max-h-[500px] w-[96%] overflow-y-auto md:max-h-max"
      >
        {error && <p className="text-center text-sm text-red-400">{error}</p>}

        <h2 className="mb-5 text-2xl font-bold">Request an Invoice/Estimate</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SlimInput
              label="Year"
              name="year"
              type="number"
              onChange={handleChange}
            />
            <SlimInput
              label="Make"
              name="make"
              type="text"
              onChange={handleChange}
            />
            <SlimInput
              label="Model"
              name="model"
              type="text"
              onChange={handleChange}
            />
            <SlimInput
              label="Service Requested"
              name="serviceRequest"
              type="text"
              onChange={handleChange}
            />
          </div>

          <SlimInput
            label="Due Date"
            name="dueDate"
            type="date"
            onChange={handleChange}
          />

          <label>
            <div className="mb-1 font-medium">Notes</div>
            <textarea
              name="notes"
              onChange={handleChange}
              className="h-[93px] w-full resize-none rounded-md border border-gray-400 px-2"
            />
          </label>
        </div>

        <InvoiceEstimateAttachment photos={photos} setPhotos={setPhotos} />

        <DialogFooter>
          <DialogClose className="rounded-lg border p-2">Cancel</DialogClose>

          <button
            disabled={pending}
            type="submit"
            className="rounded-lg bg-[#6571FF] px-5 py-2 text-white"
          >
            {pending ? <RotatingLines strokeColor="#fff" width="25" /> : "Add"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
