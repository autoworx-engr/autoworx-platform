"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/components/Dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearch } from "@/hooks/useGlobalSearch";
import { useRouter } from "next/navigation";

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const { query, setQuery, results, hasResults, isSearching } = useSearch();
  const router = useRouter();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setQuery("");
    }
  };

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="px-2 outline-none" title="Search">
          <Search className="size-5 sm:size-7 text-[#6571FF]" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] gap-0 p-0 overflow-hidden">
        <DialogTitle className="sr-only">Global Search</DialogTitle>
        <DialogDescription className="sr-only">
          Search for pages, settings, and forms
        </DialogDescription>
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-base outline-none border-none placeholder:text-muted-foreground focus-visible:ring-0 shadow-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div className="max-h-[350px] overflow-y-auto overflow-x-hidden">
          {isSearching && !hasResults && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          )}
          {hasResults && (
            <ScrollArea className="max-h-[350px] p-2">
              <div className="flex flex-col gap-1">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result.href)}
                    className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 outline-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left w-full"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {result.label}
                      </span>
                      {result.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {result.description}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
