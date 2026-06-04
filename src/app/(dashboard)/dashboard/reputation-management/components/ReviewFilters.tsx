"use client";

export interface FilterState {
  rating: string;
  status: string;
  search: string;
  sort: string;
  locationId: string;
}

interface Props {
  locations: { id: number; name: string }[];
  filters: FilterState;
  onChange: (update: Partial<FilterState>) => void;
}

export default function ReviewFilters({ locations, filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <input
        type="text"
        placeholder="Search by customer name..."
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6571FF] dark:border-gray-700 dark:bg-slate-800 dark:text-white"
      />

      <select
        value={filters.rating}
        onChange={(e) => onChange({ rating: e.target.value })}
        className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6571FF] dark:border-gray-700 dark:bg-slate-800 dark:text-white"
      >
        <option value="">All Ratings</option>
        {[5, 4, 3, 2, 1].map((r) => (
          <option key={r} value={String(r)}>
            {"★".repeat(r)}
            {"☆".repeat(5 - r)} {r} Star{r !== 1 ? "s" : ""}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => onChange({ status: e.target.value })}
        className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6571FF] dark:border-gray-700 dark:bg-slate-800 dark:text-white"
      >
        <option value="">All Status</option>
        <option value="replied">Replied</option>
        <option value="unreplied">Unreplied</option>
      </select>

      <select
        value={filters.sort}
        onChange={(e) => onChange({ sort: e.target.value })}
        className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6571FF] dark:border-gray-700 dark:bg-slate-800 dark:text-white"
      >
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
      </select>

      {locations.length > 1 && (
        <select
          value={filters.locationId}
          onChange={(e) => onChange({ locationId: e.target.value })}
          className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6571FF] dark:border-gray-700 dark:bg-slate-800 dark:text-white"
        >
          <option value="">All Locations</option>
          {locations.map((l) => (
            <option key={l.id} value={String(l.id)}>
              {l.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
