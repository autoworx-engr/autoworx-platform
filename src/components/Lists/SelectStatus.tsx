"use client";
import {
  createColumn,
  deleteColumn,
} from "@/actions/pipelines/pipelinesColumn";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/Dialog";
import useOutsideClick from "@/hooks/useOutsideClick";
import { cn } from "@/lib/cn";
import { INVOICE_COLORS } from "@/lib/consts";
import { errorToast } from "@/lib/toast";
import { useEstimateCreateStore } from "@/stores/estimate-create";
import { useFormErrorStore } from "@/stores/form-error";
import { useListsStore } from "@/stores/lists";
import { Column } from "@prisma/client";
import { Activity, ChevronUp, Palette, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../DropdownMenu";
import FormError from "../FormError";
import Submit from "../Submit";

type SelectedColor = { textColor: string; bgColor: string } | null;

export function SelectStatus({
  name = "statusId",
  value = null,
  open,
  setOpen,
  isAllServicesCompleted,
}: {
  name?: string;
  value: Column | null | undefined;
  open: boolean;
  setOpen: (open: boolean) => void;
  isAllServicesCompleted?: boolean;
}) {
  const [status, setStatus] = useState<Column | null>(null);
  const statusList = useListsStore((x) => x.statuses);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<SelectedColor>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState<number | null>(null);

  useEffect(() => {
    if (value) {
      setStatus(value);
    }
  }, [value]);

  useEffect(() => {
    if (status) {
      useListsStore.setState({ status });
    }
  }, [status]);

  const isDelivered = value?.title === "Delivered";

  useEffect(() => {
    if (statusList.length === 0) {
      useListsStore.setState({ status: null });
    }
  }, [statusList]);
  const filteredShopStatus = statusList.filter(
    (status) => status.type === "shop",
  );
  async function handleDelete(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (statusToDelete !== null) {
      const res = await deleteColumn(statusToDelete);
      if (res) {
        useListsStore.setState(({ statuses }) => ({
          statuses: statuses.filter((status) => status.id !== statusToDelete),
        }));
        if (status?.id === statusToDelete) {
          setStatus(null);
        }
      }
      setDeleteConfirmOpen(false);
    }
  }
  useOutsideClick(() => {
    // alert("outside click");
    setOpen && setOpen(false);
  });
  const restrictedColumns = [
    "Pending",
    "In Progress",
    "Completed",
    "Delivered",
  ];
  const { due } = useEstimateCreateStore();

  return (
    <div className="relative">
      <input type="hidden" name={name} value={status?.title ?? ""} />
      <DropdownMenu
        open={open}
        onOpenChange={(open) => {
          /* Logic remains untouched */
        }}
      >
        <DropdownMenuTrigger
          className="flex h-9 items-center gap-2 rounded-lg px-4 py-1 text-sm font-semibold transition-all hover:brightness-95 disabled:opacity-50 ring-1 ring-inset ring-black/5 shadow-sm"
          style={{
            backgroundColor: status?.bgColor || "#FFF",
            color: status?.textColor || "#64748B",
          }}
          onClick={() => {
            setOpen && setOpen(!open);
          }}
          disabled={isDelivered}
        >
          <Activity size={16} strokeWidth={2.5} />
          {status?.title ?? "Status"}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="bottom"
          align="start"
          sideOffset={8}
          className="w-96 overflow-hidden rounded-2xl border-none bg-white p-0 shadow-[0_20px_50px_rgba(0,0,0,0.15)] ring-1 ring-slate-200"
        >
          {/* Search Header */}
          <div className="bg-slate-50/50 p-3">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search statuses..."
                className="h-9 w-full rounded-xl border-none bg-white pl-9 pr-8 text-xs font-medium ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-primary/30 outline-none"
              />
              <button
                className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                onClick={() => setOpen && setOpen(!open)}
              >
                <ChevronUp size={14} />
              </button>
            </div>
          </div>

          {/* List Area */}
          <div className="max-h-[250px] overflow-y-auto thin-scrollbar p-2 space-y-1">
            {filteredShopStatus.map((statusItem) => (
              <div
                key={statusItem.id}
                onClick={() => {
                  /* Logic remains untouched */
                  if (statusItem.title === "Delivered" && due > 0)
                    return errorToast(
                      "You cannot update this order to Delivered until all dues are cleared.",
                    );
                  if (
                    statusItem.title === "Delivered" &&
                    !isAllServicesCompleted
                  )
                    return errorToast(
                      "All services must be completed by Technicians before moving to delivered.",
                    );
                  setStatus(statusItem);
                  setOpen && setOpen(false);
                }}
                className="group flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-bold transition-all hover:scale-[1.02] active:scale-95"
                style={{
                  backgroundColor: statusItem?.bgColor ?? undefined,
                  color: statusItem?.textColor ?? undefined,
                  boxShadow:
                    statusItem?.id === status?.id
                      ? `inset 0 0 0 2px ${status.textColor}40`
                      : "none",
                }}
              >
                {statusItem.title}
                {!restrictedColumns.includes(statusItem.title) && (
                  <button
                    className="rounded-md p-1 opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      setStatusToDelete(statusItem.id);
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 p-2">
            <FormError />
            <QuickAddForm
              onSuccess={(status) => {
                setStatus(status);
                if (setOpen) setOpen(false);
              }}
              setPickerOpen={setPickerOpen}
              selectedColor={selectedColor}
            />

            {pickerOpen && (
              <div className="mt-2 grid grid-cols-4 gap-2 rounded-xl bg-slate-50 p-2 ring-1 ring-inset ring-slate-200">
                {INVOICE_COLORS.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedColor({
                        textColor: color.textColor,
                        bgColor: color.bgColor,
                      });
                    }}
                    style={{
                      backgroundColor: color.bgColor,
                      color: color.textColor,
                    }}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-lg text-[10px] font-black transition-all hover:scale-110 shadow-sm",
                      selectedColor?.textColor === color.textColor
                        ? "ring-2 ring-offset-1 ring-slate-400"
                        : "",
                    )}
                  >
                    Aa
                  </button>
                ))}
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm rounded-[2rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-extrabold text-slate-800">
              Delete Status
            </DialogTitle>
          </DialogHeader>
          <p className="text-center text-sm font-medium text-slate-500 px-4">
            Are you sure you want to delete this status? This action cannot be
            undone.
          </p>
          <DialogFooter className="mt-4 flex gap-2 sm:justify-center">
            <DialogClose className="flex-1 rounded-xl border-none bg-slate-100 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200">
              Cancel
            </DialogClose>
            <button
              className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition-all hover:bg-rose-600 active:scale-95"
              onClick={handleDelete}
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickAddForm({
  onSuccess,
  setPickerOpen,
  selectedColor,
}: {
  onSuccess?: (value: Column) => void;
  setPickerOpen: any;
  selectedColor: SelectedColor;
}) {
  const { showError } = useFormErrorStore();
  const formRef = useRef<HTMLFormElement | null>(null);
  async function handleSubmit(data: FormData) {
    const title = data.get("name") as string;

    try {
      const newColumn = await createColumn(
        title,
        "shop",
        selectedColor?.textColor || undefined,
        selectedColor?.bgColor || undefined,
      );

      formRef.current?.reset();
      onSuccess?.(newColumn);
    } catch (error: any) {
      showError({
        field: "name",
        message: error.message || "An error occurred",
      });
    }
  }

  return (
    <form
      ref={formRef}
      className="flex items-center gap-2 p-3 bg-slate-50/50 rounded-xl mt-2 ring-1 ring-inset ring-slate-100"
    >
      <input
        name="name"
        type="text"
        required
        placeholder="New status name..."
        className="h-10 flex-1 rounded-lg border-none bg-white px-3 text-sm font-medium ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-primary/30 outline-none placeholder:text-slate-400"
      />

      <button
        className="flex h-10 w-10 shrink-0 items-center text-lg justify-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:text-primary active:scale-95"
        onClick={() => setPickerOpen((prev: boolean) => !prev)}
        type="button"
      >
        <Palette size={18} />
      </button>

      <Submit
        className="h-10 shrink-0 rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-tight text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
        formAction={handleSubmit}
      >
        Add
      </Submit>
    </form>
  );
}
