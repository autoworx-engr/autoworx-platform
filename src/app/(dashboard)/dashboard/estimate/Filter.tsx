"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/Dialog";
import { slimInputClassName } from "@/components/SlimInput";
import Submit from "@/components/Submit";
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
    [allStatuses, statusSearch]
  );

  const [statuses, setStatuses] = useState<Column[] | null>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status) {
      const decodedStatuses = decodeURIComponent(status).split(",");
      const getStatuses = useListsStore.getState().statuses;
      const selectedStatuses = getStatuses.filter((s) =>
        decodedStatuses.includes(s.id.toString())
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
        statuses.map((x) => x.id).join(",")
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
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="hidden h-10 items-center gap-2 rounded-md border-2 border-slate-400 p-1 md:flex">
        <Image
          src="/icons/Filter.svg"
          alt="Filter"
          width={20}
          height={20}
          className="cursor-pointer"
        />
        Customize
      </DialogTrigger>
      <DialogContent form>
        <DialogHeader>
          <DialogTitle>Customize</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <label className="mb-1 px-2 font-medium">Start Date</label>
            <div className="flex">
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
                      .format("YYYY-MM-DD")
                  );
                }}
                className={slimInputClassName}
              />
              <button
                type="button"
                onClick={() => setStart("")}
                className="rounded-full p-2 transition-colors hover:bg-red-200 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 px-2 font-medium">End Date</label>
            <div className="flex">
              <input
                name="endDate"
                id="endDate"
                type="date"
                onChange={(event) => {
                  setEnd(event.currentTarget.value);
                }}
                value={end}
                min={start}
                // max={today}
                className={slimInputClassName}
              />
              <button
                type="button"
                onClick={() => {
                  setEnd("");
                }}
                className="rounded-full p-2 transition-colors hover:bg-red-200 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="col-span-full">
            <label className="mb-1 px-2 font-medium">Status</label>
            <div className="relative rounded border border-solid border-slate-500 p-2">
              <div className="flex flex-col gap-x-2">
                <div>
                  <Search size={16} className="absolute m-2" />
                  <input
                    type="search"
                    value={statusSearch}
                    onChange={(event) =>
                      setStatusSearch(event.currentTarget.value)
                    }
                    className={cn(slimInputClassName, "w-1/2 ps-8")}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {statuses?.map((status) => (
                    <button
                      key={status.id}
                      type="button"
                      className="my-1 flex cursor-default items-center gap-x-1 rounded px-2"
                      style={{
                        color: status.textColor || undefined,
                        backgroundColor: status.bgColor || undefined,
                      }}
                    >
                      {status.title}
                      <XCircle
                        onClick={() => {
                          setStatuses((prev) =>
                            prev ? prev.filter((s) => s.id !== status.id) : []
                          );
                        }}
                        size={18}
                        className="cursor-pointer text-red-400"
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {searchedStatuses.map((x) => (
                  <button
                    type="button"
                    key={x.id}
                    className="rounded px-2"
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
        <DialogFooter>
          <Submit
            className="mx-auto flex items-center gap-2 rounded-md bg-[#6571FF] px-4 py-1 text-white"
            formAction={handleFilter}
          >
            <Funnel size={16} />
            Filter
          </Submit>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
