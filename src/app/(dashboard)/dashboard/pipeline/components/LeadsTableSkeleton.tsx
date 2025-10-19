import { Skeleton } from "antd";


export function LeadsTableSkeleton() {
  return (
    <div className="hidden lg:block">
      <table className="w-full shadow-md">
        <thead className="bg-background">
          <tr className="h-10 border-b">
            <th className="border-b px-4 py-2 text-left">Lead#</th>
            <th className="border-b px-4 py-2 text-left">Client</th>
            <th className="border-b px-4 py-2 text-left">Vehicle Info</th>
            <th className="border-b px-4 py-2 text-left">Services</th>
            <th className="border-b px-4 py-2 text-left">Assigned To</th>
            <th className="border-b px-4 py-2 text-left">Lead Source</th>
            <th className="border-b px-4 py-2 text-left">Status</th>
            <th className="border-b px-4 py-2 text-left">Actions</th>
            <th className="border-b px-4 py-2 text-left">Time Created</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 10 }).map((_, index) => (
            <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-blue-100"}>
              <td className="border-b px-4 py-2">
                <Skeleton className="h-4 w-6" />
              </td>
              <td className="border-b px-4 py-2">
                <Skeleton className="h-4 w-32" />
              </td>
              <td className="border-b px-4 py-2">
                <Skeleton className="h-4 w-40" />
              </td>
              <td className="border-b px-4 py-2">
                <Skeleton className="h-4 w-24" />
              </td>
              <td className="border-b px-4 py-2">
                <Skeleton className="h-4 w-28" />
              </td>
              <td className="border-b px-4 py-2">
                <Skeleton className="h-4 w-24" />
              </td>
              <td className="border-b px-4 py-2">
                <Skeleton className="h-8 w-28" />
              </td>
              <td className="border-b px-4 py-2">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-5 rounded" />
                </div>
              </td>
              <td className="border-b px-4 py-2">
                <Skeleton className="h-4 w-20" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
