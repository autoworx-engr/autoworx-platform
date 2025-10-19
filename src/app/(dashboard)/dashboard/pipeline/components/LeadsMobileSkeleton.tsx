export function LeadsMobileSkeleton() {
  return (
    <div className="space-y-4 lg:hidden">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          {/* Header: Lead number (left) and date (right) */}
          <div className="mb-4 flex items-start justify-between">
            <div className="h-6 w-12 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
          </div>

          {/* Client name */}
          <div className="mb-2">
            <div className="h-5 w-40 rounded bg-gray-200 animate-pulse" />
          </div>

          {/* Client email */}
          <div className="mb-4">
            <div className="h-3 w-32 rounded bg-gray-200 animate-pulse" />
          </div>

          {/* Vehicle info */}
          <div className="mb-3 space-y-1">
            <div className="h-4 w-36 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
          </div>

          {/* Assigned + Status row */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="h-6 w-20 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
