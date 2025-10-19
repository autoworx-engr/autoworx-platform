import { Skeleton } from "antd";


export function LeadsMobileSkeleton() {
  return (
   <div className="space-y-4 lg:hidden">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {/* Header: Lead number (left) and date (right) */}
          <div className="mb-4 flex items-start justify-between">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>

          {/* Client name */}
          <div className="mb-2">
            <Skeleton className="h-5 w-40" />
          </div>

          {/* Client email */}
          <div className="mb-4">
            <Skeleton className="h-3 w-32" />
          </div>

          {/* Vehicle info */}
          <div className="mb-3 space-y-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>

          {/* Service and status row */}
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
