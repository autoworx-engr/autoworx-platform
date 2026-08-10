export function ClientCardSkeleton() {
  return (
    <div className="lg:hidden space-y-3 px-2 pt-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg bg-white dark:bg-slate-800 p-3 shadow-sm border border-slate-100 dark:border-slate-700"
        >
          {/* Avatar */}
          <div className="h-10 w-10 shrink-0 rounded-full bg-gray-200 dark:bg-slate-600 animate-pulse" />
          {/* Text lines */}
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 rounded bg-gray-200 dark:bg-slate-600 animate-pulse" />
            <div className="h-2.5 w-24 rounded bg-gray-200 dark:bg-slate-600 animate-pulse" />
            <div className="h-2.5 w-40 rounded bg-gray-200 dark:bg-slate-600 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ClientTableSkeleton() {
  return (
    <div className="hidden lg:block">
      <table className="w-full shadow-md">
        <thead>
          <tr className="h-12 bg-[#F6F8FF] border-b">
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Client ID
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Client
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Email
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Phone
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Edit
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 15 }).map((_, i) => (
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
