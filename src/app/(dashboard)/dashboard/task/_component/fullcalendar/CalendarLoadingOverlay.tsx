export function CalendarLoadingOverlay({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
      <div className="flex items-center gap-3 rounded-md border bg-white px-4 py-2 shadow-sm">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
        <span className="text-sm font-medium text-slate-700">
          Loading calendar data...
        </span>
      </div>
    </div>
  );
}
