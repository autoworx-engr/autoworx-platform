export default function CompanyProfileCardSkeleton() {
  return (
    <div className="w-full max-w-[380px] rounded-xl bg-white shadow-md border p-4 space-y-4 animate-pulse">
      {/* Header */}
      <div className="h-5 w-24 bg-gray-200 rounded" />

      {/* Avatar */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="w-[150px] h-[150px] rounded-full bg-gray-200" />

        <div className="h-5 w-40 bg-gray-200 rounded" />
        <div className="h-4 w-28 bg-gray-200 rounded" />

        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-4 h-4 bg-gray-200 rounded" />
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-100 p-3 space-y-2">
          <div className="w-4 h-4 bg-gray-200 rounded mx-auto" />
          <div className="h-3 w-16 bg-gray-200 rounded mx-auto" />
          <div className="h-4 w-20 bg-gray-200 rounded mx-auto" />
        </div>

        <div className="rounded-lg bg-gray-100 p-3 space-y-2">
          <div className="w-4 h-4 bg-gray-200 rounded mx-auto" />
          <div className="h-3 w-16 bg-gray-200 rounded mx-auto" />
          <div className="h-4 w-20 bg-gray-200 rounded mx-auto" />
        </div>
      </div>

      {/* About */}
      <div className="space-y-2">
        <div className="h-4 w-20 bg-gray-200 rounded" />
        <div className="h-3 w-full bg-gray-200 rounded" />
        <div className="h-3 w-[90%] bg-gray-200 rounded" />
      </div>

      {/* Specializations */}
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 rounded" />

        <div className="flex gap-2">
          <div className="h-6 w-20 bg-gray-200 rounded-full" />
          <div className="h-6 w-16 bg-gray-200 rounded-full" />
          <div className="h-6 w-24 bg-gray-200 rounded-full" />
        </div>
      </div>

      {/* Collaboration */}
      <div className="rounded-lg bg-gray-100 p-3 flex justify-between">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-gray-200 rounded" />
          <div className="h-3 w-32 bg-gray-200 rounded" />
        </div>

        <div className="h-5 w-8 bg-gray-200 rounded" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <div className="h-8 flex-1 bg-gray-200 rounded-md" />
        <div className="h-8 flex-1 bg-gray-200 rounded-md" />
      </div>

      {/* Review */}
      <div className="space-y-2">
        <div className="h-3 w-20 bg-gray-200 rounded" />
        <div className="h-3 w-full bg-gray-200 rounded" />
        <div className="h-3 w-[80%] bg-gray-200 rounded" />
      </div>
    </div>
  );
}
