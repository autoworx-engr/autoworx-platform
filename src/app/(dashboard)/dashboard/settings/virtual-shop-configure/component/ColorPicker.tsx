import React from "react";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
}) => (
  <div>
    <label className="block font-medium">{label}</label>
    <input
      type="color"
      className="mt-1 h-10 w-16 border rounded"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);
