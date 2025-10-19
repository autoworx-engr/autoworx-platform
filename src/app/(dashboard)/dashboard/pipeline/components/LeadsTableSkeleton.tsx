export function LeadsTableSkeleton() {
  return (
    <div className="hidden lg:block">
      <table className="w-full shadow-md">
        <thead>
          <tr className="h-12 bg-[#F6F8FF] border-b">
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Lead#
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Client
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Vehicle Info
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Services
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Assigned To
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Lead Source
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Status
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Actions
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Time Created
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#F3F8FF]"}>
              <td className="border-b px-4 py-4 align-top">
                <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
              </td>

              <td className="border-b px-4 py-4 align-top">
                <div className="h-3 w-28 rounded bg-gray-200 animate-pulse" />
              </td>

              <td className="border-b px-4 py-4 align-top">
                <div className="h-4 w-56 rounded bg-gray-200 animate-pulse" />
              </td>

              <td className="border-b px-4 py-4 align-top">
                <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
              </td>

              <td className="border-b px-4 py-4 align-top">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
                </div>
              </td>

              <td className="border-b px-4 py-4 align-top">
                <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
              </td>

              <td className="border-b px-4 py-4 align-top">
                <div className="h-8 w-28 rounded-md bg-gray-200 animate-pulse" />
              </td>

              <td className="border-b px-4 py-4 align-top">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
                  <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
                  <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
                  <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
                </div>
              </td>

              <td className="border-b px-4 py-4 align-top">
                <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
