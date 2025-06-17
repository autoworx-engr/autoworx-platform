import React from "react";

interface Option {
  label: string;
  value: string;
}

interface CustomRadioGroupProps {
  name: string;
  value: string;
  options: Option[];
  onChange: any;
  label?: string;
}

const CustomRadioGroup: React.FC<CustomRadioGroupProps> = ({
  name,
  value,
  options,
  onChange,
  label,
}) => {
  return (
    <div className="my-4">
      {label && <p className="mb-2 font-medium">{label}</p>}
      <div className="flex gap-6">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-2 ${
              value === option.value
                ? "font-semibold text-blue-600"
                : "text-gray-700"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(name, option.value)}
              className="accent-blue-600"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
};

export default CustomRadioGroup;
