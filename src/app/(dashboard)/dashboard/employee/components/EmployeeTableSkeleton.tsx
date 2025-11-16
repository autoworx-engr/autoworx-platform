export function EmployeeTableSkeleton() {
  return (
    <div className="hidden lg:block">
      <table className="w-full shadow-md">
        <thead>
          <tr className="h-12 bg-[#F6F8FF] border-b">
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Employee ID
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Name
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Email
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Phone
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Joined
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
              Type
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
                <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
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
