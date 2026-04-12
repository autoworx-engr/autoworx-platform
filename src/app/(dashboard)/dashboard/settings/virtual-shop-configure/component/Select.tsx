import React from "react";

interface SelectProps {
  label: string;
  value: string | undefined;
  options: string[];
  onChange: (value: string) => void;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  options,
  onChange,
}) => (
  <div>
    <label className="block font-medium">{label}</label>
    <select
      className="mt-1 border rounded p-2"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((f) => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
    </select>
  </div>
);
