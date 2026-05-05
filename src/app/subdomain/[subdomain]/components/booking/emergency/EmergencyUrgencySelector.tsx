"use client";

import { URGENCY_COLORS, URGENCY_LEVELS, UrgencyLevel } from "./types";

interface EmergencyUrgencySelectorProps {
  value: UrgencyLevel;
  onChange: (level: UrgencyLevel) => void;
}

export function EmergencyUrgencySelector({
  value,
  onChange,
}: EmergencyUrgencySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {URGENCY_LEVELS.map((level) => (
        <button
          key={level.value}
          type="button"
          onClick={() => onChange(level.value)}
          className={`p-3 rounded-xl border-2 text-left transition-all ${
            value === level.value
              ? URGENCY_COLORS[level.value]
              : "border-border hover:border-muted-foreground"
          }`}
        >
          <div className="font-semibold text-xs">{level.label}</div>
          <div className="text-xs opacity-70 mt-0.5">{level.desc}</div>
        </button>
      ))}
    </div>
  );
}
