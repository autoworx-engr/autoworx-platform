import { cn } from "@/lib/cn";

export function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-white text-teal-700 shadow-sm dark:bg-zinc-900 dark:text-teal-300"
          : "text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
      )}
    >
      {children}
    </button>
  );
}
