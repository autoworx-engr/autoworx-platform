"use client";

import { Company, User } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CollaborationToggle from "./CollaborationToggle";
import CompanyListItem from "./CompanyListItem";
import { useInfinityCollaborationCompanies } from "./hooks/useInfinityCollaborationCompanies";

type TProps = {
  companies: (Company & { users: User[] })[];
  selectedCompany: Company | null;
  companyAdmins: any;
  setCompanyAdmins: React.Dispatch<React.SetStateAction<Partial<User>[]>>;
  setSelectedCompany: React.Dispatch<React.SetStateAction<Company | null>>;
  isCollaborators: boolean | null | undefined;
  companyId: number;
};

export default function List({
  companies,
  selectedCompany,
  isCollaborators,
  companyAdmins,
  setCompanyAdmins,
  companyId,
}: TProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Debounce the search input to avoid hammering the API on every keystroke
  useEffect(() => {
    const handle = setTimeout(
      () => setDebouncedSearch(searchInput.trim()),
      300,
    );
    return () => clearTimeout(handle);
  }, [searchInput]);

  const {
    data: pagesData,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfinityCollaborationCompanies(debouncedSearch);

  const loadedCompanies = useMemo(
    () => pagesData?.pages?.flatMap((p) => p.data) ?? [],
    [pagesData],
  );

  const handleSelectCompany = (company: { id: number }) => {
    const params = new URLSearchParams(searchParams);
    params.set("companyId", company.id.toString());
    router.replace(`?${params.toString()}`);
  };

  const maybeLoadMore = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || isFetchingNextPage || !hasNextPage) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", maybeLoadMore, { passive: true });
    return () => el.removeEventListener("scroll", maybeLoadMore);
  }, [maybeLoadMore]);

  // If first page doesn't fill the visible area, fetch more
  useEffect(() => {
    if (!isLoading) maybeLoadMore();
  }, [isLoading, loadedCompanies.length, maybeLoadMore]);

  return (
    <div
      ref={scrollContainerRef}
      className="app-shadow h-screen w-full overflow-y-auto rounded-lg bg-background p-3 md:h-[83vh] md:w-[30%]"
    >
      <CollaborationToggle
        companyId={companyId}
        initialValue={isCollaborators ?? false}
        companies={companies}
        setCompanyAdmins={setCompanyAdmins}
        companyAdmins={companyAdmins}
      />

      {/* Search */}
      <input
        type="text"
        placeholder="Search company"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="my-3 w-full rounded-md border-2 border-[#006D77] p-2"
      />

      <div className="flex flex-col gap-2">
        {isLoading && loadedCompanies.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">Loading…</div>
        ) : loadedCompanies.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">
            {debouncedSearch
              ? "No companies match your search"
              : "No collaborators yet"}
          </div>
        ) : (
          loadedCompanies.map((company) => (
            <CompanyListItem
              key={company.id}
              company={company as any}
              currentCompanyId={companyId}
              selectedCompanyId={selectedCompany?.id ?? null}
              onSelect={() => handleSelectCompany(company)}
            />
          ))
        )}

        {isFetchingNextPage && (
          <div className="py-2 text-center text-xs text-gray-400">
            Loading more…
          </div>
        )}
      </div>
    </div>
  );
}
