export function CrmPageHeader({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description?: string;
  badge?: string | number;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[1.75rem] font-bold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
            {title}
          </h1>
          {badge != null && (
            <span className="inline-flex h-6 items-center rounded-full bg-teal-50 dark:bg-teal-900/30 px-2.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300 ring-1 ring-teal-200/70 dark:ring-teal-700/40">
              {badge}
            </span>
          )}
        </div>
        {description ? (
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
