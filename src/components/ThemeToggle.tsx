"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const modes = [
  { value: "light", icon: Sun,     label: "Light" },
  { value: "dark",  icon: Moon,    label: "Dark" },
  { value: "system",icon: Monitor, label: "System" },
] as const;

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  if (compact) {
    const next = theme === "dark" ? "light" : "dark";
    const Icon = theme === "dark" ? Sun : Moon;
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-all hover:bg-white/8 hover:text-zinc-300"
        aria-label={`Switch to ${next} mode`}
        title={`Switch to ${next} mode`}
      >
        <Icon className="h-4 w-4 transition-transform duration-200" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-zinc-800/60 bg-zinc-900/60 p-0.5">
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          title={label}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150",
            theme === value
              ? "bg-teal-500/20 text-teal-300 shadow-inner"
              : "text-zinc-600 hover:text-zinc-300",
          )}
          aria-label={label}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

/** Header variant — renders a pill-style button in the top bar */
export function HeaderThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return (
    <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
  );

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
        "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
        "hover:bg-zinc-100 dark:hover:bg-zinc-800",
      )}
      aria-label="Toggle theme"
    >
      {isDark
        ? <Sun  className="h-4 w-4" />
        : <Moon className="h-4 w-4" />
      }
    </button>
  );
}
