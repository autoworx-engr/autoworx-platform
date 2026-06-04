export default function MessageListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4 p-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`flex items-end gap-2 ${
            i % 2 === 0 ? "flex-row" : "flex-row-reverse"
          }`}
        >
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-200" />
          <div className="flex flex-col gap-1">
            <div
              className="h-10 animate-pulse rounded-2xl bg-gray-200"
              style={{ width: `${120 + ((i * 37) % 100)}px` }}
            />
            <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
