export function LeadsTableSkeleton() {
  return (
    <table className="w-full border-separate border-spacing-0">
      <thead className="sticky top-0 z-10 bg-white shadow-sm">
        <tr className="h-10 border-b">
          <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600">
            Lead#
          </th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600">
            Client
          </th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600">
            Vehicle Info
          </th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600">
            Services
          </th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600">
            Assigned To
          </th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600">
            Lead Source
          </th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600">
            Status
          </th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600">
            Actions
          </th>
          <th className="px-4 py-2 text-left text-sm font-semibold text-slate-600">
            Time Created
          </th>
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 15 }).map((_, i) => (
          <tr
            key={i}
            className={i % 2 === 0 ? "bg-background" : "bg-[#F8FAFF]"}
          >
            <td className="px-4 py-4 align-top">
              <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
            </td>

            <td className="px-4 py-4 align-top">
              <div className="h-3 w-28 rounded bg-gray-200 animate-pulse" />
            </td>

            <td className="px-4 py-4 align-top">
              <div className="h-4 w-56 rounded bg-gray-200 animate-pulse" />
            </td>

            <td className="px-4 py-4 align-top">
              <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
            </td>

            <td className="px-4 py-4 align-top">
              <div className="flex items-center gap-3">
                <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
              </div>
            </td>

            <td className="px-4 py-4 align-top">
              <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
            </td>

            <td className="px-4 py-4 align-top">
              <div className="h-8 w-28 rounded-md bg-gray-200 animate-pulse" />
            </td>

            <td className="px-4 py-4 align-top">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
                <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
                <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
                <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
              </div>
            </td>

            <td className="px-4 py-4 align-top">
              <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
