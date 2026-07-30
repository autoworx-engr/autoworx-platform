"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import { slimInputClassName } from "@/components/SlimInput";
import Submit from "@/components/Submit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useListsStore } from "@/stores/lists";
import { Column } from "@prisma/client";
import { Funnel, Search, X, XCircle } from "lucide-react";
import { matchSorter } from "match-sorter";
import moment from "moment";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TFilterProps = {
  startDate?: string;
  endDate?: string;
  status?: string;
};

export function Filter({ startDate, endDate, status }: TFilterProps) {
  const params = useSearchParams();
  const pathname = usePathname();
  const [start, setStart] = useState(startDate ?? "");
  const [end, setEnd] = useState(endDate ?? "");

  const router = useRouter();

  const [statusSearch, setStatusSearch] = useState("");
  let allStatuses = useListsStore((x) => x.statuses);
  allStatuses = allStatuses.filter((x) => x.type === "shop");
  const searchedStatuses = useMemo(
    () =>
      statusSearch
        ? matchSorter(allStatuses, statusSearch, { keys: ["title"] })
        : allStatuses,
    [allStatuses, statusSearch],
  );

  const [statuses, setStatuses] = useState<Column[] | null>([]);
  const [open, setOpen] = useState(false);

  const isIncompleteDateRange = Boolean(start) !== Boolean(end);

  useEffect(() => {
    if (status) {
      const decodedStatuses = decodeURIComponent(status).split(",");
      const getStatuses = useListsStore.getState().statuses;
      const selectedStatuses = getStatuses.filter((s) =>
        decodedStatuses.includes(s.id.toString()),
      );
      // If no statuses are found, set to an empty array
      setStatuses(selectedStatuses);
    }
  }, [status]);

  const handleFilter = async (formData: FormData) => {
    const searchParams = new URLSearchParams(params.toString());
    if (start) {
      searchParams.set("startDate", start);
    } else {
      searchParams.delete("startDate");
    }
    if (end) {
      searchParams.set("endDate", end);
    } else {
      searchParams.delete("endDate");
    }
    if (statuses && statuses.length > 0) {
      const encodedStatuses = encodeURIComponent(
        statuses.map((x) => x.id).join(","),
      );
      searchParams.set("status", encodedStatuses);
    } else {
      searchParams.delete("status");
    }
    if (searchParams.has("page")) {
      searchParams.delete("page");
    }
    if (searchParams.has("take")) {
      searchParams.delete("take");
    }
    const newPath = `${pathname}?${searchParams.toString()}`;
    router.push(newPath);
    setOpen(false);
  };

  const clearFilters = () => {
    setStart("");
    setEnd("");
    setStatuses([]);

    const searchParams = new URLSearchParams(params.toString());
    searchParams.delete("startDate");
    searchParams.delete("endDate");
    searchParams.delete("status");
    searchParams.delete("page");
    searchParams.delete("take");

    const newPath = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    router.push(newPath);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="hidden h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-slate-500 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-50 hover:ring-primary/30 active:scale-95 md:flex">
        <Image
          src="/icons/Filter.svg"
          alt="Filter"
          width={18}
          height={18}
          className="cursor-pointer opacity-70"
        />
        Customize
      </DialogTrigger>

      <DialogContent
        form
        className="max-w-xl overflow-hidden rounded-[1.5rem] border-none bg-white p-0 shadow-2xl"
      >
        <DialogHeader className="bg-slate-50/50 px-6 py-4">
          <DialogTitle className="text-lg font-bold tracking-tight text-slate-500">
            Customize
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 px-6">
          {/* Start Date */}
          <div className="space-y-1.5">
            <label className="ml-1 text-sm font-semibold tracking-wider text-slate-600">
              Start Date
            </label>
            <div className="flex items-center gap-2">
              <input
                name="startDate"
                id="startDate"
                type="date"
                value={start}
                onChange={(event) => {
                  setStart(event.currentTarget.value);
                  setEnd(
                    moment(event.currentTarget.value)
                      .add(1, "day")
                      .format("YYYY-MM-DD"),
                  );
                }}
                className={cn(
                  slimInputClassName,
                  "h-10 w-full rounded-lg border-none bg-slate-50 px-3 text-sm ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-primary/30 outline-none",
                )}
              />
              <button
                type="button"
                onClick={() => setStart("")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <label className="ml-1 text-sm font-semibold tracking-wider text-slate-600">
              End Date
            </label>
            <div className="flex items-center gap-2">
              <input
                name="endDate"
                id="endDate"
                type="date"
                onChange={(event) => setEnd(event.currentTarget.value)}
                value={end}
                min={start}
                className={cn(
                  slimInputClassName,
                  "h-10 w-full rounded-lg border-none bg-slate-50 px-3 text-sm ring-1 ring-slate-200 transition-all focus:bg-white focus:ring-2 focus:ring-primary/30 outline-none",
                )}
              />
              <button
                type="button"
                onClick={() => setEnd("")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
              >
                <X size={18} className="cursor-pointer" />
              </button>
            </div>
          </div>

          {isIncompleteDateRange && (
            <p className="col-span-full -mt-4 ml-1 text-xs font-medium text-rose-500">
              Please select both a start date and an end date to filter by date
              range.
            </p>
          )}

          {/* Status Section */}
          <div className="col-span-full space-y-2">
            <label className="ml-1 text-sm font-semibold tracking-wider text-slate-600">
              Status
            </label>
            <div className="relative rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <div className="flex flex-col gap-4">
                <div className="relative flex items-center">
                  <Search
                    size={16}
                    className="absolute left-3 text-slate-400 z-50"
                  />
                  <input
                    type="search"
                    value={statusSearch}
                    onChange={(event) =>
                      setStatusSearch(event.currentTarget.value)
                    }
                    className={cn(
                      slimInputClassName,
                      "h-9 w-1/2 rounded-lg border-none bg-white ps-9 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-primary/30 outline-none",
                    )}
                  />
                </div>

                {/* Selected Statuses */}
                <div className="flex flex-wrap gap-2">
                  {statuses?.map((status) => (
                    <button
                      key={status.id}
                      type="button"
                      className="flex items-center gap-1.5 rounded-lg px-2.5 pt-1 pb-1.5 mb-2 text-sm font-semibold shadow-sm ring-1 ring-inset ring-black/5 transition-transform active:scale-95"
                      style={{
                        color: status.textColor || undefined,
                        backgroundColor: status.bgColor || undefined,
                      }}
                    >
                      {status.title}
                      <XCircle
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatuses((prev) =>
                            prev ? prev.filter((s) => s.id !== status.id) : [],
                          );
                        }}
                        size={16}
                        className="cursor-pointer"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Suggestions */}
              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                {searchedStatuses.map((x) => (
                  <button
                    type="button"
                    key={x.id}
                    className="rounded-lg px-2.5 pt-1 pb-1.5 text-sm font-semibold transition-all hover:brightness-95 active:scale-95 shadow-sm"
                    style={{
                      color: x.textColor || undefined,
                      backgroundColor: x.bgColor || undefined,
                    }}
                    onClick={() => {
                      setStatuses((prev) => {
                        if (!prev) return [x];
                        return prev.includes(x)
                          ? prev.filter((status) => status.id !== x.id)
                          : [...prev, x];
                      });
                    }}
                  >
                    {x.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-50/50 p-4 flex items-center justify-end gap-2">
          <DialogClose
            className="w-fit flex h-10 items-center gap-2 rounded-xl px-8 text-sm font-medium text-red-500 border border-red-100 shadow-sm transition-all active:scale-95"
            onClick={clearFilters}
          >
            <XCircle size={16} />
            Clear Filters
          </DialogClose>
          <Submit
            className="w-fit flex h-10 items-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            formAction={handleFilter}
            disabled={isIncompleteDateRange}
          >
            <Funnel size={16} />
            Filter Results
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
