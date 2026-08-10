import React from "react";

const PRESETS = [
  "#4f6ef7",
  "#e74c3c",
  "#2ecc71",
  "#f5a623",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#34495e",
  "#e91e63",
  "#00bcd4",
];

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
}) => {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>

      {/* Main color field */}
      <div
        className="flex items-center gap-2.5 px-3 py-2 border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition-colors cursor-pointer"
        onClick={() => document.getElementById("brandColorInput")?.click()}
      >
        <div
          className="w-7 h-7 rounded-md border border-gray-200 flex-shrink-0 relative overflow-hidden"
          style={{ background: value }}
        >
          <input
            id="brandColorInput"
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
        <span className="text-sm font-mono font-medium text-gray-800 flex-1">
          {value.toUpperCase()}
        </span>
      </div>

      {/* Swatches */}
      <div className="flex gap-1.5 flex-wrap mt-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            title={preset}
            onClick={() => onChange(preset)}
            className="w-6 h-6 rounded-md border border-gray-200 hover:scale-110 transition-transform flex-shrink-0"
            style={{
              background: preset,
              outline:
                value.toLowerCase() === preset ? `2px solid ${preset}` : "none",
              outlineOffset: "2px",
            }}
          />
        ))}
      </div>
    </div>
  );
};
